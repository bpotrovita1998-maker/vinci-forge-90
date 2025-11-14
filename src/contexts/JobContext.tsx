import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Job, GenerationOptions, JobStatus } from '@/types/job';
import { lovableAIService } from '@/services/lovableAIService';
import { mockGenerationService } from '@/services/mockGenerationService';
// import { pythonBackendService } from '@/services/pythonBackendService'; // OPTION B: Uncomment to use Python backend
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { websocketService } from '@/services/websocketService';
import { moderationService, ModerationResult } from '@/services/moderationService';

// Select which service to use:
// - lovableAIService: Uses Lovable AI (google/gemini-2.5-flash-image) - ACTIVE
// - mockGenerationService: Mock service for testing
// - pythonBackendService: Python FastAPI backend integration - DISABLED
const generationService = lovableAIService; // Change this to switch services

interface JobContextType {
  jobs: Job[];
  activeJob: Job | null;
  submitJob: (options: GenerationOptions) => Promise<string>;
  cancelJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<void>;
  clearCompletedJobs: () => void;
  getJob: (jobId: string) => Job | undefined;
  moderateContent: (prompt: string) => Promise<ModerationResult>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    websocketService.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error);
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Load jobs from database when user logs in
  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }

    const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const checkAndTimeoutJobs = async (jobsList: Job[]) => {
      const now = Date.now();
      const timedOutJobs: string[] = [];

      for (const job of jobsList) {
        const isActive = job.status === 'running' || job.status === 'queued';
        const jobAge = now - job.createdAt.getTime();
        
        if (isActive && jobAge > JOB_TIMEOUT_MS) {
          console.log(`Job ${job.id} timed out after ${Math.round(jobAge / 1000)}s`);
          timedOutJobs.push(job.id);
          
          // Mark as failed in database
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              progress_stage: 'failed',
              error: `Job timed out after ${Math.round(JOB_TIMEOUT_MS / 1000 / 60)} minutes`,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Unsubscribe from WebSocket
          websocketService.unsubscribeFromJob(job.id);
        }
      }

      if (timedOutJobs.length > 0) {
        setJobs(prevJobs =>
          prevJobs.map(j =>
            timedOutJobs.includes(j.id)
              ? {
                  ...j,
                  status: 'failed' as JobStatus,
                  progress: { ...j.progress, stage: 'failed' as JobStatus },
                  error: `Job timed out after ${Math.round(JOB_TIMEOUT_MS / 1000 / 60)} minutes`,
                  completedAt: new Date()
                }
              : j
          )
        );
      }
    };

    const loadJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load jobs:', error);
        toast.error('Failed to load job history');
        return;
      }

      if (data) {
        const jobsWithDates: Job[] = data.map((dbJob: any) => ({
          id: dbJob.id,
          options: {
            prompt: dbJob.prompt,
            negativePrompt: dbJob.negative_prompt,
            type: dbJob.type,
            width: dbJob.width,
            height: dbJob.height,
            duration: dbJob.duration,
            fps: dbJob.fps,
            videoMode: dbJob.video_mode,
            threeDMode: dbJob.three_d_mode,
            seed: dbJob.seed,
            steps: dbJob.steps,
            cfgScale: dbJob.cfg_scale,
            numImages: dbJob.num_images,
          },
          status: dbJob.status,
          progress: {
            stage: dbJob.progress_stage,
            progress: dbJob.progress_percent,
            currentStep: dbJob.current_step,
            totalSteps: dbJob.total_steps,
            eta: dbJob.eta,
            message: dbJob.progress_message,
          },
          outputs: dbJob.outputs || [],
          manifest: dbJob.manifest,
          createdAt: new Date(dbJob.created_at),
          startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
          completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
          error: dbJob.error,
        }));
        setJobs(jobsWithDates);

        // Check for timed out jobs immediately after loading
        await checkAndTimeoutJobs(jobsWithDates);
      }
    };

    loadJobs();

    // Set up interval to check for timeouts every 30 seconds
    const timeoutCheckInterval = setInterval(async () => {
      setJobs(prevJobs => {
        checkAndTimeoutJobs(prevJobs);
        return prevJobs;
      });
    }, 30000);

    return () => {
      clearInterval(timeoutCheckInterval);
    };
  }, [user]);

  // Update active job whenever jobs change
  useEffect(() => {
    const runningJob = jobs.find(j => 
      j.status === 'running' || j.status === 'upscaling' || j.status === 'encoding'
    );
    setActiveJob(runningJob || null);
  }, [jobs]);

  const submitJob = useCallback(async (options: GenerationOptions): Promise<string> => {
    if (!user) {
      toast.error('Please sign in to generate content');
      throw new Error('User not authenticated');
    }

    // Generate job ID first
    const jobId = crypto.randomUUID();

    // Calculate estimated tokens based on generation type
    // Token costs match exact AI costs: Image = 2, Video = 30, 3D = 10
    let estimatedTokens = 0;
    let actionType: 'image_generation' | 'video_generation' | 'vectorization' = 'image_generation';
    
    if (options.type === 'image') {
      estimatedTokens = (options.numImages || 1) * 2; // 2 tokens per image
      actionType = 'image_generation';
    } else if (options.type === 'video') {
      estimatedTokens = 30; // 30 tokens per video
      actionType = 'video_generation';
    } else if (options.type === '3d') {
      estimatedTokens = 10; // 10 tokens per 3D model
      actionType = 'image_generation'; // Closest match
    }

    // Check and deduct tokens before starting generation
    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'check-and-deduct-tokens',
        {
          body: {
            jobId,
            actionType,
            estimatedTokens
          }
        }
      );

      if (tokenError) {
        console.error('Token deduction failed:', tokenError);
        const errorMessage = tokenError.message || 'Failed to deduct tokens';
        
        if (errorMessage.includes('Insufficient token balance')) {
          toast.error('Insufficient tokens. Please purchase more tokens to continue.');
        } else if (errorMessage.includes('No active subscription')) {
          toast.error('No active subscription. Please subscribe to continue.');
        } else {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      if (!tokenData?.success) {
        toast.error('Failed to process token deduction');
        throw new Error('Token deduction failed');
      }

    console.log('Tokens deducted successfully:', tokenData);
    } catch (error) {
      console.error('Error during token check:', error);
      throw error;
    }

    // Create initial job in database BEFORE starting generation
    const { error: insertError } = await supabase.from('jobs').insert({
      id: jobId,
      user_id: user.id,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      type: options.type,
      status: 'queued',
      width: options.width,
      height: options.height,
      duration: options.duration,
      fps: options.fps,
      video_mode: options.videoMode,
      three_d_mode: options.threeDMode,
      seed: options.seed,
      steps: options.steps,
      cfg_scale: options.cfgScale,
      num_images: options.numImages,
      progress_stage: 'queued',
      progress_percent: 0,
      progress_message: 'Job queued...',
    });

    if (insertError) {
      console.error('Failed to save job:', insertError);
      toast.error('Failed to save job');
      throw new Error('Failed to save job to database');
    }

    console.log('Job created in database:', jobId);

    // Now submit the job to the generation service with the same jobId
    console.log('Starting generation service for job:', jobId);
    await generationService.submitJob(options, jobId);

    // Create initial job in local state
    const newJob: Job = {
      id: jobId,
      options,
      status: 'queued',
      progress: {
        stage: 'queued',
        progress: 0,
        message: 'Job queued...',
      },
      outputs: [],
      createdAt: new Date(),
    };

    setJobs(prev => [newJob, ...prev]);

    // Start listening for updates via both polling and WebSocket
    generationService.onJobUpdate(jobId, async (updatedJob) => {
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      
      // Show completion toast
      if (updatedJob.status === 'completed' && updatedJob.outputs.length > 0) {
        toast.success('Generation complete! Click "View Output" to see your result.');
      } else if (updatedJob.status === 'failed') {
        toast.error(`Generation failed: ${updatedJob.error || 'Unknown error'}`);
      }
      
      // Update job in database
      await supabase.from('jobs').update({
        status: updatedJob.status,
        progress_stage: updatedJob.progress.stage,
        progress_percent: Math.round(updatedJob.progress.progress || 0),
        current_step: updatedJob.progress.currentStep,
        total_steps: updatedJob.progress.totalSteps,
        eta: updatedJob.progress.eta,
        progress_message: updatedJob.progress.message,
        outputs: updatedJob.outputs as any,
        manifest: updatedJob.manifest as any,
        error: updatedJob.error,
        started_at: updatedJob.startedAt?.toISOString(),
        completed_at: updatedJob.completedAt?.toISOString(),
      }).eq('id', jobId);

      // Stop listening to WebSocket updates once job is finalized
      if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
        websocketService.unsubscribeFromJob(jobId);
      }
    });

    // Also subscribe to WebSocket updates for real-time progress
    if (websocketService.isConnected()) {
      console.log('Subscribing to WebSocket updates for job:', jobId);
      websocketService.subscribeToJob(jobId, async (partialJob) => {
        console.log('WebSocket update received for job:', jobId, partialJob);
        
        setJobs(prev => prev.map(j => {
          if (j.id !== jobId) return j;
          // Ignore WebSocket updates once job is finalized to prevent loops
          if (j.status === 'completed' || j.status === 'failed') {
            console.log('Ignoring WebSocket update for finalized job:', jobId);
            return j;
          }
          
          // Merge the partial update with existing job data
          const updated = {
            ...j,
            status: partialJob.status || j.status,
            progress: partialJob.progress != null ? partialJob.progress : j.progress,
            outputs: partialJob.outputs || j.outputs,
            error: partialJob.error || j.error,
          };
          
          console.log('Updated job from WebSocket:', updated);
          return updated;
        }));

        // Show completion toast
        if (partialJob.status === 'completed') {
          toast.success('Generation complete! Click the job to view your result.');
          websocketService.unsubscribeFromJob(jobId);
        } else if (partialJob.status === 'failed') {
          toast.error(`Generation failed: ${partialJob.error || 'Unknown error'}`);
          websocketService.unsubscribeFromJob(jobId);
        }
      });
    } else {
      console.warn('WebSocket not connected, cannot subscribe to job updates');
    }

    return jobId;
  }, [user]);

  const cancelJob = useCallback(async (jobId: string) => {
    generationService.cancelJob(jobId);
    websocketService.unsubscribeFromJob(jobId);
    
    const cancelledJob = { status: 'failed' as JobStatus, error: 'Cancelled by user' };
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, ...cancelledJob } : j
    ));

    // Update in database
    if (user) {
      await supabase.from('jobs').update({
        status: 'failed',
        error: 'Cancelled by user',
      }).eq('id', jobId);
    }
  }, [user]);

  const deleteJob = useCallback(async (jobId: string) => {
    // Remove from local state
    setJobs(prev => prev.filter(j => j.id !== jobId));

    // Delete from database
    if (user) {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) {
        console.error('Failed to delete job:', error);
        toast.error('Failed to delete job');
      } else {
        toast.success('Job deleted');
      }
    }
  }, [user]);

  const clearCompletedJobs = useCallback(async () => {
    const completedJobIds = jobs
      .filter(j => j.status === 'completed' || j.status === 'failed')
      .map(j => j.id);

    setJobs(prev => prev.filter(j => 
      j.status !== 'completed' && j.status !== 'failed'
    ));

    // Delete from database
    if (user && completedJobIds.length > 0) {
      await supabase.from('jobs').delete().in('id', completedJobIds);
    }
  }, [jobs, user]);

  const getJob = useCallback((jobId: string) => {
    return jobs.find(j => j.id === jobId);
  }, [jobs]);

  const moderateContent = useCallback(async (prompt: string): Promise<ModerationResult> => {
    return await moderationService.moderatePrompt(prompt);
  }, []);

  return (
    <JobContext.Provider value={{
      jobs,
      activeJob,
      submitJob,
      cancelJob,
      deleteJob,
      clearCompletedJobs,
      getJob,
      moderateContent,
    }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within JobProvider');
  }
  return context;
}
