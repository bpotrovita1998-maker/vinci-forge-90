import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Job, GenerationOptions, JobStatus } from '@/types/job';
import { lovableAIService } from '@/services/lovableAIService';
import { mockGenerationService } from '@/services/mockGenerationService';
// import { pythonBackendService } from '@/services/pythonBackendService'; // OPTION B: Uncomment to use Python backend
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { websocketService } from '@/services/websocketService';
import { moderationService, ModerationResult } from '@/services/moderationService';
import { stitchVideos } from '@/services/videoStitchingService';

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
  loadMoreJobs: () => Promise<void>;
  hasMoreJobs: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  retryLoadJobs: () => void;
  refreshJobs: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [pollInterval, setPollInterval] = useState(2000); // Start with 2 seconds
  const pollStartTimes = useRef<Map<string, number>>(new Map());
  const { user } = useAuth();
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const JOBS_PER_PAGE = 100; // Load more jobs for gallery
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Initialize WebSocket connection
  useEffect(() => {
    websocketService.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error);
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Fallback polling for active jobs with exponential backoff
  useEffect(() => {
    if (!user) return;

    const pollTimer = setInterval(async () => {
      // Query active jobs directly from state without depending on the jobs array
      setJobs(prev => {
        const activeJobs = prev.filter(j => 
          ['queued', 'running', 'upscaling', 'encoding', 'starting', 'processing'].includes(j.status)
        );

        if (activeJobs.length === 0) {
          // Reset poll interval when no active jobs
          setPollInterval(2000);
          pollStartTimes.current.clear();
          return prev;
        }

        // Calculate backoff based on oldest active job
        let oldestJobAge = 0;
        activeJobs.forEach(job => {
          const startTime = pollStartTimes.current.get(job.id) || Date.now();
          if (!pollStartTimes.current.has(job.id)) {
            pollStartTimes.current.set(job.id, startTime);
          }
          const age = Date.now() - startTime;
          oldestJobAge = Math.max(oldestJobAge, age);
        });

        // Exponential backoff: 2s → 4s → 8s → 16s → 30s (max)
        const newInterval = Math.min(
          2000 * Math.pow(2, Math.floor(oldestJobAge / 30000)), // Double every 30 seconds
          30000 // Max 30 seconds
        );
        
        if (newInterval !== pollInterval) {
          console.log(`Adjusting poll interval to ${newInterval}ms based on job age ${Math.round(oldestJobAge / 1000)}s`);
          setPollInterval(newInterval);
        }

        console.log(`Polling ${activeJobs.length} active jobs (interval: ${pollInterval}ms)`);

        // Poll each active job
        activeJobs.forEach(async (job) => {
          const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', job.id)
            .maybeSingle();

          if (error) {
            console.error('Failed to poll job status:', error);
            return;
          }
          
          if (!data) {
            console.warn('Job not found during polling:', job.id);
            return;
          }

          if (data && (data.status !== job.status || data.progress_percent !== job.progress.progress)) {
            console.log(`Job ${job.id} status changed from ${job.status} to ${data.status}`);
            
            const updatedJob: Job = {
              ...job,
              status: data.status as JobStatus,
              progress: {
                stage: data.progress_stage as JobStatus,
                progress: data.progress_percent,
                message: data.progress_message || '',
                currentStep: data.current_step || undefined,
                totalSteps: data.total_steps || undefined,
                eta: data.eta || undefined,
              },
              outputs: (data.outputs as string[]) || [],
              error: data.error || undefined,
              completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            };

            setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));

            // Check if this is a multi-scene video that needs stitching
            const shouldStitch = data.status === 'completed' && 
                                 data.type === 'video' && 
                                 (data.manifest as any)?.scenePrompts?.length > 1 &&
                                 (data.outputs as string[])?.length === (data.manifest as any)?.scenePrompts?.length;

            if (shouldStitch) {
              console.log(`Triggering video stitching for job ${job.id}`);
              
              // Start stitching in the background
              stitchVideos(
                data.outputs as string[],
                job.id,
                data.user_id,
                (progress) => {
                  setJobs(prev => prev.map(j => 
                    j.id === job.id 
                      ? { 
                          ...j, 
                          progress: { 
                            ...j.progress, 
                            progress, 
                            message: 'Stitching video scenes...' 
                          } 
                        } 
                      : j
                  ));
                }
              ).then(async (stitchedUrl) => {
                console.log(`Stitching complete for job ${job.id}:`, stitchedUrl);
                
                // Update job with stitched video added to outputs
                const updatedOutputs = [...(data.outputs as string[]), stitchedUrl];
                
                await supabase
                  .from('jobs')
                  .update({
                    outputs: updatedOutputs,
                    progress_percent: 100,
                    progress_message: 'Video stitched successfully!'
                  })
                  .eq('id', job.id);
                
                // Update local state
                setJobs(prev => prev.map(j => 
                  j.id === job.id 
                    ? { ...j, outputs: updatedOutputs } 
                    : j
                ));
                
                toast.success('Multi-scene video stitched successfully!');
              }).catch(async (error) => {
                console.error(`Stitching failed for job ${job.id}:`, error);
                
                // Still mark as complete but with a warning
                await supabase
                  .from('jobs')
                  .update({
                    progress_message: 'Video generated (stitching failed - showing individual scenes)'
                  })
                  .eq('id', job.id);
                
                toast.error('Video stitching failed, showing individual scenes');
              });
            }

            // Clean up poll tracking when job completes
            if (data.status === 'completed' || data.status === 'failed') {
              pollStartTimes.current.delete(job.id);
            }

            // Show notifications (only for non-stitching completions)
            if (data.status === 'completed' && (data.outputs as any[])?.length > 0 && !shouldStitch) {
              toast.success('Generation complete! Click the job to view your result.');
              websocketService.unsubscribeFromJob(job.id);
            } else if (data.status === 'failed') {
              // Don't show toast for timeout errors - they're expected and auto-handled
              const isTimeout = data.error?.includes('Timeout');
              if (!isTimeout) {
                toast.error(`Generation failed: ${data.error || 'Unknown error'}`);
              }
              websocketService.unsubscribeFromJob(job.id);
            }
          }
        });

        return prev;
      });
    }, pollInterval);

    return () => clearInterval(pollTimer);
  }, [user, pollInterval]);

  // Load jobs from database when user logs in
  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }

    const checkAndTimeoutJobs = async (jobsList: Job[]) => {
      const now = Date.now();
      const timedOutJobs: string[] = [];

      for (const job of jobsList) {
        const isActive = job.status === 'running' || job.status === 'queued';
        const jobAge = now - job.createdAt.getTime();
        
        // Video jobs can take longer, so use 30 minute timeout for them
        const JOB_TIMEOUT_MS = job.options.type === 'video' 
          ? 30 * 60 * 1000  // 30 minutes for video
          : 15 * 60 * 1000; // 15 minutes for others
        
        if (isActive && jobAge > JOB_TIMEOUT_MS) {
          console.log(`Job ${job.id} timed out after ${Math.round(jobAge / 1000)}s`);
          timedOutJobs.push(job.id);
          
          const timeoutMinutes = Math.round(JOB_TIMEOUT_MS / 1000 / 60);
          
          // Mark as failed in database
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              progress_stage: 'failed',
              error: `Job timed out after ${timeoutMinutes} minutes`,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Unsubscribe from WebSocket
          websocketService.unsubscribeFromJob(job.id);
          
          // Store the error message for later use
          job.error = `Job timed out after ${timeoutMinutes} minutes`;
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
                  error: j.error || 'Job timed out',
                  completedAt: new Date()
                }
              : j
          )
        );
      }
    };

    const loadJobs = async (reset = false, retryAttempt = 0) => {
      const offset = reset ? 0 : currentPage * JOBS_PER_PAGE;
      
      try {
        setLoadError(null);
        
        // OPTIMIZATION: Load jobs metadata first WITHOUT the large outputs field
        // This prevents timeouts caused by massive base64 data in outputs
        const { data: metadataData, error: metadataError, count } = await supabase
          .from('jobs')
          .select('id, user_id, type, status, prompt, negative_prompt, width, height, three_d_mode, duration, fps, video_mode, num_images, num_videos, upscale_video, progress_stage, progress_percent, progress_message, current_step, total_steps, eta, created_at, started_at, completed_at, error, manifest, seed, steps, cfg_scale, updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(JOBS_PER_PAGE)
          .range(offset, offset + JOBS_PER_PAGE - 1);

        if (metadataError) {
          console.error('Failed to load jobs metadata:', metadataError);
          
          if (metadataError.code === '57014' && retryAttempt < MAX_RETRIES) {
            console.log(`Query timeout, retrying... (${retryAttempt + 1}/${MAX_RETRIES})`);
            setRetryCount(retryAttempt + 1);
            const delay = 2000 * Math.pow(2, retryAttempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            return loadJobs(reset, retryAttempt + 1);
          } else if (metadataError.code === '57014') {
            setLoadError('Database query timed out. Your database instance may need an upgrade for better performance.');
            toast.error('Failed to load gallery. Database timeout - please upgrade your instance size.', { duration: 5000 });
          } else {
            setLoadError('Failed to load job history');
            toast.error('Failed to load job history');
          }
          return;
        }

        if (!metadataData || metadataData.length === 0) {
          if (reset) {
            setJobs([]);
            setCurrentPage(1);
          }
          setHasMoreJobs(false);
          return;
        }

        // Now load outputs separately for completed jobs only
        // Filter to get only URL-based outputs (skip base64 which causes timeouts)
        const completedJobIds = metadataData
          .filter((j: any) => j.status === 'completed')
          .map((j: any) => j.id);

        let outputsMap: Record<string, string[]> = {};
        
        if (completedJobIds.length > 0) {
          // Load outputs in smaller batches to avoid timeout
          const BATCH_SIZE = 20;
          for (let i = 0; i < completedJobIds.length; i += BATCH_SIZE) {
            const batchIds = completedJobIds.slice(i, i + BATCH_SIZE);
            const { data: outputsData, error: outputsError } = await supabase
              .from('jobs')
              .select('id, outputs, compressed_outputs')
              .in('id', batchIds);
            
            if (!outputsError && outputsData) {
              outputsData.forEach((job: any) => {
                // Prefer compressed_outputs if available, otherwise use outputs
                // Skip any outputs that are base64 (they're too large and should be migrated)
                const outputs = job.compressed_outputs || job.outputs || [];
                const validOutputs = Array.isArray(outputs) 
                  ? outputs.filter((o: string) => typeof o === 'string' && o.startsWith('http'))
                  : [];
                outputsMap[job.id] = validOutputs;
              });
            }
          }
        }

        // Merge metadata with outputs
        const data = metadataData.map((job: any) => ({
          ...job,
          outputs: outputsMap[job.id] || [],
          compressed_outputs: undefined, // Already merged into outputs
        }));

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
              message: dbJob.progress_message || '',
            },
            outputs: dbJob.outputs as string[],
            compressed_outputs: dbJob.compressed_outputs as string[] | undefined,
            manifest: dbJob.manifest,
            createdAt: new Date(dbJob.created_at),
            startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
            completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
            error: dbJob.error,
            userId: dbJob.user_id,
          }));
          
          if (reset) {
            // When resetting, preserve any jobs that were just created locally
            // but might not be in the fetched results yet
            setJobs(prev => {
              // Find jobs in prev that are very recent (< 5 seconds old) and not in fetched data
              const now = Date.now();
              const recentLocalJobs = prev.filter(job => {
                const jobAge = now - job.createdAt.getTime();
                const isVeryRecent = jobAge < 5000; // Less than 5 seconds old
                const notInFetchedData = !jobsWithDates.some(fetchedJob => fetchedJob.id === job.id);
                return isVeryRecent && notInFetchedData;
              });
              
              if (recentLocalJobs.length > 0) {
                console.log('Preserving', recentLocalJobs.length, 'recent local jobs during reload');
                return [...recentLocalJobs, ...jobsWithDates];
              }
              
              return jobsWithDates;
            });
            setCurrentPage(1);
          } else {
            setJobs(prev => [...prev, ...jobsWithDates]);
          }
          
          // Check if there are more jobs to load
          const totalJobs = count || 0;
          const loadedJobs = reset ? jobsWithDates.length : jobs.length + jobsWithDates.length;
          setHasMoreJobs(loadedJobs < totalJobs);

          // Check for timed out jobs immediately after loading
          await checkAndTimeoutJobs(jobsWithDates);
          
          // Reset retry count on success
          setRetryCount(0);
        }
      } catch (err) {
        console.error('Unexpected error loading jobs:', err);
        setLoadError('An unexpected error occurred');
        toast.error('Failed to load gallery');
      }
    };

    loadJobs(true);

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
  }, [user?.id]); // Only re-run when user ID changes, not the entire user object

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
    // Token costs: Image = 1, Video = 30 (FREE for Zeroscope), 3D = 10, CAD = 10
    let estimatedTokens = 0;
    let actionType: 'image_generation' | 'video_generation' | 'vectorization' = 'image_generation';
    
    if (options.type === 'image') {
      estimatedTokens = (options.numImages || 1) * 1; // 1 token per image ($0.01)
      actionType = 'image_generation';
    } else if (options.type === 'video') {
      const numVideos = options.numVideos || 1;
      // Token costs: AnimateDiff (15), Haiper (30), Veo 3.1 (120)
      const tokenCostPerVideo = 
        options.videoModel === 'animatediff' ? 15 :
        options.videoModel === 'haiper' ? 30 :
        120; // Veo 3.1 default
      
      estimatedTokens = tokenCostPerVideo * numVideos;
      console.log(`Using ${options.videoModel || 'veo'} model - ${estimatedTokens} tokens for ${numVideos} video(s)`);
      actionType = 'video_generation';
    } else if (options.type === '3d') {
      estimatedTokens = 10; // 10 tokens per 3D model ($0.10)
      actionType = 'vectorization';
    } else if (options.type === 'cad') {
      estimatedTokens = 10; // 10 tokens per CAD model ($0.10)
      actionType = 'vectorization';
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
        
        // Extract error message from various possible locations
        let errorMessage = tokenError.message || 'Failed to deduct tokens';
        
        // Check if error has a nested error property (common in edge function responses)
        if (tokenData && typeof tokenData === 'object' && 'error' in tokenData) {
          errorMessage = (tokenData as any).error;
        }
        
        console.log('Extracted error message:', errorMessage);
        
        // Check if this is a PRO-only feature (CAD, Video, 3D)
        if (options.type === 'cad' || options.type === 'video' || options.type === '3d') {
          if (errorMessage.includes('PRO') || errorMessage.includes('subscription') || errorMessage.includes('free')) {
            toast.error('Upgrade to PRO subscription to enable this feature');
            throw new Error('PRO subscription required');
          }
        }
        
        // Check if user is out of free images
        if (options.type === 'image' && errorMessage.includes('5 images')) {
          toast.error("You've used all 5 free images. Upgrade to PRO to continue.");
          throw new Error('Free image limit reached');
        }
        
        // Handle other token-related errors
        if (errorMessage.includes('Insufficient token balance')) {
          toast.error('Insufficient tokens. Please purchase more tokens to continue.');
        } else if (errorMessage.includes('subscription')) {
          toast.error('Upgrade to PRO subscription to enable this feature');
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
    const manifest = options.type === 'video' ? { videoModel: options.videoModel || 'animatediff' } : undefined;
    
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
      num_videos: options.numVideos,
      upscale_video: options.upscaleVideo,
      manifest: manifest,
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
        // Don't show toast for timeout errors - they're expected and auto-handled
        const isTimeout = updatedJob.error?.includes('Timeout');
        if (!isTimeout) {
          toast.error(`Generation failed: ${updatedJob.error || 'Unknown error'}`);
        }
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
          
          // Prevent backwards status transitions to avoid flickering
          if (partialJob.status) {
            const statusOrder: JobStatus[] = ['queued', 'running', 'upscaling', 'encoding', 'completed', 'failed'];
            const currentIndex = statusOrder.indexOf(j.status);
            const newIndex = statusOrder.indexOf(partialJob.status);
            
            if (currentIndex > newIndex && partialJob.status !== 'failed') {
              console.log(`Ignoring backwards status transition from ${j.status} to ${partialJob.status}`);
              return j;
            }
          }
          
          // Check if anything actually changed to prevent unnecessary re-renders
          const hasStatusChange = partialJob.status && partialJob.status !== j.status;
          const hasProgressChange = partialJob.progress && (
            partialJob.progress.progress !== j.progress.progress ||
            partialJob.progress.stage !== j.progress.stage ||
            partialJob.progress.message !== j.progress.message
          );
          const hasOutputsChange = partialJob.outputs && JSON.stringify(partialJob.outputs) !== JSON.stringify(j.outputs);
          const hasErrorChange = partialJob.error && partialJob.error !== j.error;
          
          if (!hasStatusChange && !hasProgressChange && !hasOutputsChange && !hasErrorChange) {
            return j;
          }
          
          // Merge the partial update with existing job data
          const updated = {
            ...j,
            status: partialJob.status || j.status,
            progress: partialJob.progress || j.progress,
            outputs: partialJob.outputs || j.outputs,
            error: partialJob.error || j.error,
          };
          
          return updated;
        }));

        // Show completion toast
        if (partialJob.status === 'completed') {
          toast.success('Generation complete! Optimizing for fast loading...');
          websocketService.unsubscribeFromJob(jobId);
          
          // Trigger compression asynchronously (don't wait for it)
          setTimeout(() => {
            import('@/services/compressionService').then(({ compressImage, compressVideoThumbnail, uploadCompressedFile }) => {
              const compressJobOutputs = async () => {
                if (!partialJob.outputs || partialJob.outputs.length === 0) return;
                
                const job = jobs.find(j => j.id === jobId);
                if (!job) return;

                try {
                  const compressedUrls: string[] = [];
                  
                  for (let i = 0; i < partialJob.outputs.length; i++) {
                    const outputUrl = partialJob.outputs[i];
                    
                    try {
                      let compressionResult;
                      
                      if (job.options.type === 'image') {
                        compressionResult = await compressImage(outputUrl);
                      } else if (job.options.type === 'video') {
                        compressionResult = await compressVideoThumbnail(outputUrl);
                      } else {
                        // Skip compression for 3D/CAD (use poster cache)
                        compressedUrls.push(outputUrl);
                        continue;
                      }

                      const compressedUrl = await uploadCompressedFile(
                        compressionResult.compressedBlob,
                        outputUrl,
                        job.options.type
                      );

                      compressedUrls.push(compressedUrl);
                    } catch (error) {
                      console.error(`Failed to compress output ${i}:`, error);
                      compressedUrls.push(outputUrl);
                    }
                  }

                  // Update database
                  await supabase.from('jobs').update({ 
                    compressed_outputs: compressedUrls 
                  }).eq('id', jobId);
                  
                  console.log('Compression complete for job', jobId);
                } catch (error) {
                  console.error('Compression failed:', error);
                }
              };
              
              compressJobOutputs();
            });
          }, 1000);
        } else if (partialJob.status === 'failed') {
          // Don't show toast for timeout errors - they're expected and auto-handled
          const isTimeout = partialJob.error?.includes('Timeout');
          if (!isTimeout) {
            toast.error(`Generation failed: ${partialJob.error || 'Unknown error'}`);
          }
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

  const loadMoreJobs = useCallback(async () => {
    if (isLoadingMore || !hasMoreJobs) return;
    
    setIsLoadingMore(true);
    try {
      const offset = currentPage * JOBS_PER_PAGE;
      
      const { data, error, count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + JOBS_PER_PAGE - 1);

      if (error) {
        console.error('Failed to load more jobs:', error);
        toast.error('Failed to load more jobs');
        return;
      }

      if (data && data.length > 0) {
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
        
        setJobs(prev => [...prev, ...jobsWithDates]);
        setCurrentPage(prev => prev + 1);
        
        const totalJobs = count || 0;
        const loadedJobs = jobs.length + jobsWithDates.length;
        setHasMoreJobs(loadedJobs < totalJobs);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, isLoadingMore, hasMoreJobs, jobs.length, JOBS_PER_PAGE]);

  const moderateContent = useCallback(async (prompt: string): Promise<ModerationResult> => {
    return await moderationService.moderatePrompt(prompt);
  }, []);

  const refreshJobs = useCallback(async () => {
    setJobs([]);
    setCurrentPage(0);
    setLoadError(null);
    setRetryCount(0);
    setHasMoreJobs(false);
    
    // Reload from scratch - load all jobs at once
    if (!user?.id) return;
    
    try {
      // Load all completed jobs first (no limit)
      const { data, error, count } = await supabase
        .from('jobs')
        .select('id, user_id, type, status, prompt, negative_prompt, width, height, three_d_mode, duration, fps, video_mode, num_images, num_videos, upscale_video, progress_stage, progress_percent, progress_message, current_step, total_steps, eta, created_at, started_at, completed_at, error, manifest, outputs, seed, steps, cfg_scale, updated_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500); // Load up to 500 jobs at once

      if (error) {
        console.error('Failed to refresh jobs:', error);
        toast.error('Failed to refresh gallery');
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
            message: dbJob.progress_message || '',
          },
          outputs: dbJob.outputs as string[],
          manifest: dbJob.manifest,
          createdAt: new Date(dbJob.created_at),
          startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
          completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
          error: dbJob.error,
          userId: dbJob.user_id,
        }));

        setJobs(jobsWithDates);
        const totalJobs = count || 0;
        setHasMoreJobs(jobsWithDates.length < totalJobs);
        
        const completedCount = jobsWithDates.filter(j => j.status === 'completed').length;
        toast.success(`Loaded ${completedCount} completed items from permanent storage`);
      }
    } catch (err) {
      console.error('Error refreshing jobs:', err);
      toast.error('Failed to refresh gallery');
    }
  }, [user?.id]);

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
      loadMoreJobs,
      hasMoreJobs,
      isLoadingMore,
      loadError,
      retryLoadJobs: () => {
        setJobs([]);
        setCurrentPage(0);
        setLoadError(null);
        setRetryCount(0);
      },
      refreshJobs,
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
