import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Job, GenerationOptions, JobStatus } from '@/types/job';
import { mockGenerationService } from '@/services/mockGenerationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface JobContextType {
  jobs: Job[];
  activeJob: Job | null;
  submitJob: (options: GenerationOptions) => Promise<string>;
  cancelJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  getJob: (jobId: string) => Job | undefined;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const { user } = useAuth();

  // Load jobs from database when user logs in
  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }

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
      }
    };

    loadJobs();
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

    const jobId = await mockGenerationService.submitJob(options);
    
    // Create initial job in database
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
    }

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

    // Start listening for updates
    mockGenerationService.onJobUpdate(jobId, async (updatedJob) => {
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      
      // Update job in database
      await supabase.from('jobs').update({
        status: updatedJob.status,
        progress_stage: updatedJob.progress.stage,
        progress_percent: updatedJob.progress.progress,
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
    });

    return jobId;
  }, [user]);

  const cancelJob = useCallback(async (jobId: string) => {
    mockGenerationService.cancelJob(jobId);
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

  return (
    <JobContext.Provider value={{
      jobs,
      activeJob,
      submitJob,
      cancelJob,
      clearCompletedJobs,
      getJob,
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
