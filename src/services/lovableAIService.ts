import { GenerationOptions, Job, JobStatus } from '@/types/job';
import { supabase } from '@/integrations/supabase/client';

type JobUpdateCallback = (job: Job) => void;

class LovableAIService {
  private jobs: Map<string, Job> = new Map();
  private callbacks: Map<string, JobUpdateCallback> = new Map();
  private predictionIds: Map<string, string> = new Map(); // Track prediction IDs for cancellation
  private cancelledJobs: Set<string> = new Set(); // Track cancelled jobs

  async submitJob(options: GenerationOptions, jobId?: string): Promise<string> {
    // Use provided jobId or generate a new one
    const actualJobId = jobId || crypto.randomUUID();
    
    console.log('LovableAI: Submitting job', actualJobId, options);
    
    const job: Job = {
      id: actualJobId,
      options,
      status: 'queued',
      progress: {
        stage: 'queued',
        progress: 0,
        message: 'Preparing generation...',
      },
      outputs: [],
      createdAt: new Date(),
    };

    this.jobs.set(actualJobId, job);
    
    // Start processing immediately
    console.log('LovableAI: Starting processJob for', actualJobId);
    this.processJob(actualJobId).catch(error => {
      console.error('LovableAI: processJob failed:', error);
      this.failJob(actualJobId, error.message);
    });

    return actualJobId;
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('LovableAI: Job not found:', jobId);
      return;
    }

    console.log('LovableAI: Processing job', jobId, 'type:', job.options.type);

    try {
      // Update to running
      this.updateJobStage(jobId, 'running', 'Generating with AI...');

      // Handle different generation types
      if (job.options.type === 'image') {
        console.log('LovableAI: Starting image generation for', jobId);
        await this.generateImage(jobId);
      } else if (job.options.type === 'video') {
        console.log('LovableAI: Starting video generation for', jobId);
        // Generate video as a sequence of frames (for now, just generate one key frame)
        await this.generateVideoFrames(jobId);
      } else if (job.options.type === '3d') {
        console.log('LovableAI: Starting 3D generation for', jobId);
        await this.generate3D(jobId);
      } else if (job.options.type === 'cad') {
        console.log('LovableAI: Starting CAD generation for', jobId);
        await this.generateCAD(jobId);
      }
      
    } catch (error) {
      console.error('LovableAI: Job processing error:', jobId, error);
      this.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async generateVideoFrames(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('LovableAI: Job not found in generateVideoFrames:', jobId);
      return;
    }

    console.log('LovableAI: Starting async video generation for', jobId);

    try {
      // Start async video generation (returns prediction ID)
      this.updateJobStage(jobId, 'running', 'Starting video generation...');
      
      const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: job.options.prompt,
          jobId: jobId,
        }
      });

      console.log('LovableAI: Video generation started:', { videoData, videoError });

      if (videoError) {
        console.error('LovableAI: Failed to start video generation:', videoError);
        throw new Error('Failed to start video generation');
      }

      if (!videoData?.predictionId) {
        console.error('LovableAI: No prediction ID in response:', videoData);
        throw new Error('Failed to start video generation');
      }

      const predictionId = videoData.predictionId;
      console.log('LovableAI: Video prediction started with ID:', predictionId);
      
      // Store prediction ID for cancellation
      this.predictionIds.set(jobId, predictionId);
      
      // Poll for completion
      this.updateJobStage(jobId, 'encoding', 'Video generation in progress...');
      
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max (5s intervals)
      
      while (attempts < maxAttempts) {
        // Check if job was cancelled
        if (this.cancelledJobs.has(jobId)) {
          console.log('LovableAI: Job cancelled, breaking polling loop');
          this.cancelledJobs.delete(jobId);
          return;
        }
        
        // Check job status from local state
        const currentJob = this.jobs.get(jobId);
        if (currentJob && (currentJob.status === 'failed' || currentJob.status === 'completed')) {
          console.log('LovableAI: Job status changed externally, stopping polling');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        console.log(`LovableAI: Polling video status (attempt ${attempts}/${maxAttempts})`);
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-video', {
          body: {
            predictionId: predictionId,
            jobId: jobId,
          }
        });
        
        if (statusError) {
          console.error('LovableAI: Status check error:', statusError);
          continue;
        }
        
        console.log('LovableAI: Prediction status:', statusData?.status);
        
        if (statusData?.status === 'succeeded') {
          console.log('LovableAI: Video generation completed successfully');
          this.updateJobStage(jobId, 'completed', 'Video generated successfully');
          
          // Fetch the updated job from database to get the final URL
          const { data: updatedJob, error: fetchError } = await supabase
            .from('jobs')
            .select('outputs')
            .eq('id', jobId)
            .maybeSingle();
          
          if (fetchError) {
            console.error('LovableAI: Failed to fetch job outputs:', fetchError);
            throw new Error('Failed to fetch completed job data');
          }
          
          if (updatedJob?.outputs && Array.isArray(updatedJob.outputs) && updatedJob.outputs.length > 0) {
            this.completeJob(jobId, updatedJob.outputs as string[]);
          } else {
            // Fallback: extract URL from prediction
            const videoUrl = statusData?.output || (Array.isArray(statusData?.output) ? statusData.output[0] : null);
            if (videoUrl) {
              this.completeJob(jobId, [videoUrl]);
            } else {
              // Grace period
              await new Promise(r => setTimeout(r, 1500));
              const { data: updatedJob2 } = await supabase
                .from('jobs')
                .select('outputs')
                .eq('id', jobId)
                .maybeSingle();
              if (updatedJob2?.outputs && Array.isArray(updatedJob2.outputs) && updatedJob2.outputs.length > 0) {
                this.completeJob(jobId, updatedJob2.outputs as string[]);
              } else {
                console.warn('LovableAI: No video URL found after completion; keeping job completed');
                this.updateJobStage(jobId, 'completed', 'Video generated, finalizing...');
              }
            }
          }
          return;
        } else if (statusData?.status === 'failed') {
          console.error('LovableAI: Video generation failed');
          throw new Error('Video generation failed');
        }
        
        // Update progress if available
        if (statusData?.logs) {
          this.updateJobStage(jobId, 'encoding', 'Processing video...');
        }
      }
      
      // Timeout
      console.error('LovableAI: Video generation timed out');
      throw new Error('Video generation timed out');

    } catch (error) {
      console.error('LovableAI: Video generation error for', jobId, ':', error);
      throw error;
    }
  }

  private async generate3D(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('LovableAI: Job not found in generate3D:', jobId);
      return;
    }

    console.log('LovableAI: Starting async 3D generation for', jobId);

    try {
      // Step 1: Generate a reference image first
      this.updateJobStage(jobId, 'running', 'Generating reference image...');
      
      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `${job.options.prompt}. Clean white background, professional product shot, centered object, high detail.`,
          width: job.options.width,
          height: job.options.height,
          numImages: 1,
        }
      });

      if (imageError || !imageData?.images?.[0]) {
        throw new Error('Failed to generate reference image');
      }

      console.log('LovableAI: Reference image generated, starting async 3D conversion');
      
      // Step 2: Start async 3D generation (returns prediction ID)
      this.updateJobStage(jobId, 'upscaling', 'Starting 3D generation...');
      
      const { data: threeDData, error: threeDError } = await supabase.functions.invoke('generate-3d', {
        body: {
          inputImage: imageData.images[0],
          seed: job.options.seed,
          jobId: jobId,
        }
      });

      console.log('LovableAI: 3D generation started:', { threeDData, threeDError });

      if (threeDError) {
        console.error('LovableAI: Failed to start 3D generation:', threeDError);
        throw new Error('Failed to start 3D generation');
      }

      if (!threeDData?.predictionId) {
        console.error('LovableAI: No prediction ID in response:', threeDData);
        throw new Error('Failed to start 3D generation');
      }

      const predictionId = threeDData.predictionId;
      console.log('LovableAI: 3D prediction started with ID:', predictionId);
      
      // Store prediction ID for cancellation
      this.predictionIds.set(jobId, predictionId);
      
      // Step 3: Poll for completion
      this.updateJobStage(jobId, 'upscaling', '3D generation in progress...');
      
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max (5s intervals)
      
      while (attempts < maxAttempts) {
        // Check if job was cancelled
        if (this.cancelledJobs.has(jobId)) {
          console.log('LovableAI: Job cancelled, breaking polling loop');
          this.cancelledJobs.delete(jobId); // Clean up here
          return;
        }
        
        // Also check job status from local state
        const currentJob = this.jobs.get(jobId);
        if (currentJob && (currentJob.status === 'failed' || currentJob.status === 'completed')) {
          console.log('LovableAI: Job status changed externally, stopping polling');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        console.log(`LovableAI: Polling 3D status (attempt ${attempts}/${maxAttempts})`);
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-3d', {
          body: {
            statusCheck: true,
            predictionId: predictionId,
            jobId: jobId,
          }
        });
        
        if (statusError) {
          console.error('LovableAI: Status check error:', statusError);
          continue;
        }
        
        console.log('LovableAI: Prediction status:', statusData?.status);
        
        if (statusData?.status === 'succeeded') {
          console.log('LovableAI: 3D generation completed successfully');
          this.updateJobStage(jobId, 'completed', '3D model generated successfully');
          
          // Fetch the updated job from database to get the final URL
          const { data: updatedJob, error: fetchError } = await supabase
            .from('jobs')
            .select('outputs')
            .eq('id', jobId)
            .maybeSingle();
          
          if (fetchError) {
            console.error('LovableAI: Failed to fetch job outputs:', fetchError);
            throw new Error('Failed to fetch completed job data');
          }
          
          if (updatedJob?.outputs && Array.isArray(updatedJob.outputs) && updatedJob.outputs.length > 0) {
            this.completeJob(jobId, updatedJob.outputs as string[]);
          } else {
            // Fallback: try to extract a URL from the Replicate prediction payload directly
            const pred = statusData?.prediction as any;
            const output = pred?.output as any;
            let modelUrl: string | null = null;

            if (output) {
              if (typeof output === 'string') {
                modelUrl = output;
              } else if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
                modelUrl = output[0];
              } else if (typeof output === 'object') {
                modelUrl = (output.mesh as string) || (output.glb as string) || (output.gltf as string) || (output.url as string) || null;
              }
            }

            if (modelUrl) {
              // Immediately complete with the direct URL from the model provider
              this.completeJob(jobId, [modelUrl]);
            } else {
              // Grace period: allow the backend to finish persisting to storage
              await new Promise((r) => setTimeout(r, 1500));
              const { data: updatedJob2 } = await supabase
                .from('jobs')
                .select('outputs')
                .eq('id', jobId)
                .maybeSingle();
              if (updatedJob2?.outputs && Array.isArray(updatedJob2.outputs) && updatedJob2.outputs.length > 0) {
                this.completeJob(jobId, updatedJob2.outputs as string[]);
              } else {
                console.warn('LovableAI: No output URL found after completion; keeping job completed while storage finalizes');
                // Don't throw: avoid flipping a server-completed job to failed in the UI
                this.updateJobStage(jobId, 'completed', '3D model generated, finalizing...');
              }
            }
          }
          return;
        } else if (statusData?.status === 'failed') {
          throw new Error('3D generation failed on Replicate');
        }
        
        // Update progress message
        const progressPercent = Math.min(90, 10 + (attempts / maxAttempts) * 80);
        this.updateJobStage(jobId, 'upscaling', `3D generation in progress... (${Math.floor(progressPercent)}%)`);
      }
      
      throw new Error('3D generation timed out');

    } catch (error) {
      console.error('LovableAI: 3D generation error for', jobId, ':', error);
      throw error;
    }
  }

  private async generateCAD(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('LovableAI: Job not found in generateCAD:', jobId);
      return;
    }

    console.log('LovableAI: Generating CAD model for', jobId);

    try {
      // Step 1: Generate a reference image with CAD-optimized prompt
      this.updateJobStage(jobId, 'running', 'Generating CAD reference image...');
      
      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `${job.options.prompt}. Engineering CAD model, technical drawing, isometric view, precise geometry, professional industrial design, clean edges, symmetrical, suitable for manufacturing.`,
          width: job.options.width,
          height: job.options.height,
          numImages: 1,
        }
      });

      if (imageError || !imageData?.images?.[0]) {
        throw new Error('Failed to generate CAD reference image');
      }

      console.log('LovableAI: CAD reference image generated, converting to 3D mesh');
      
      // Step 2: Convert to high-quality CAD mesh
      this.updateJobStage(jobId, 'upscaling', 'Generating CAD-quality mesh...');
      
      const { data: cadData, error: cadError } = await supabase.functions.invoke('generate-cad', {
        body: {
          inputImage: imageData.images[0],
          seed: job.options.seed,
          jobId: jobId,
          prompt: job.options.prompt,
        }
      });

      console.log('LovableAI: CAD generation initial response:', { cadData, cadError });

      if (cadError) {
        console.error('LovableAI: CAD generation error:', cadError);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const httpErr = cadError as any;
          if (httpErr?.context?.json) {
            const errBody = await httpErr.context.json();
            const msg = errBody?.error || errBody?.message || httpErr.message;
            throw new Error(msg || 'Failed to generate CAD model');
          }
        } catch (_) {
          throw new Error((cadError as Error).message || 'Failed to generate CAD model');
        }
      }

      // Handle new async flow: predictionId based polling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const first = cadData as any;
      if (first?.predictionId) {
        const predictionId: string = first.predictionId;
        console.log('LovableAI: Received predictionId for CAD:', predictionId);
        
        // Store prediction ID for cancellation
        this.predictionIds.set(jobId, predictionId);

        // Poll the edge function for status until completion/failure
        const start = Date.now();
        const timeoutMs = 10 * 60 * 1000; // 10 minutes max
        let delay = 2000; // 2s initial

        while (Date.now() - start < timeoutMs) {
          // Check if job was cancelled
          if (this.cancelledJobs.has(jobId)) {
            console.log('LovableAI: CAD job cancelled, breaking polling loop');
            this.cancelledJobs.delete(jobId); // Clean up here
            return;
          }
          
          // Also check job status from local state
          const currentJob = this.jobs.get(jobId);
          if (currentJob && (currentJob.status === 'failed' || currentJob.status === 'completed')) {
            console.log('LovableAI: CAD job status changed externally, stopping polling');
            return;
          }
          
          // Poll the edge function for status until completion/failure
          const { data: statusData, error: statusErr } = await supabase.functions.invoke('generate-cad', {
            body: { predictionId, jobId, prompt: job.options.prompt }
          });

          console.log('LovableAI: CAD status response:', { statusData, statusErr });

          if (statusErr) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const httpErr = statusErr as any;
              if (httpErr?.context?.json) {
                const errBody = await httpErr.context.json();
                const msg = errBody?.error || errBody?.message || httpErr.message;
                throw new Error(msg || 'CAD status check failed');
              }
            } catch (_) {
              throw new Error((statusErr as Error).message || 'CAD status check failed');
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sd: any = statusData;
          const status: string | undefined = sd?.status;
          const outputUrl: string | undefined = sd?.output;

          if (status === 'succeeded') {
            // Prefer direct output from the status payload
            if (outputUrl) {
              console.log('LovableAI: CAD model ready for', jobId, outputUrl);
              this.completeJob(jobId, [outputUrl]);
              return;
            }
            // Fallback: the edge function may have persisted the file and updated the DB
            try {
              const { data: jobRow, error: fetchError } = await supabase
                .from('jobs')
                .select('outputs')
                .eq('id', jobId)
                .maybeSingle();
              
              if (!fetchError && jobRow) {
                const outs = (jobRow.outputs as string[] | null) || [];
                if (outs.length > 0) {
                  console.log('LovableAI: CAD model persisted and found in DB for', jobId, outs[0]);
                  this.completeJob(jobId, outs);
                  return;
                }
              }
            } catch (e) {
              console.warn('LovableAI: DB lookup after success failed, will keep polling', e);
            }
          }

          if (status === 'failed' || status === 'canceled') {
            throw new Error('CAD generation failed');
          }

          // Keep waiting
          await new Promise((r) => setTimeout(r, delay));
          // Optional: exponential backoff up to 10s
          delay = Math.min(delay * 1.25, 10000);
        }

        // Timeout: last attempt to salvage from DB
        try {
          const { data: jobRow, error: fetchError } = await supabase
            .from('jobs')
            .select('outputs, status')
            .eq('id', jobId)
            .maybeSingle();
          
          if (!fetchError && jobRow) {
            const outs = (jobRow.outputs as string[] | null) || [];
            if (outs.length > 0) {
              console.log('LovableAI: Completing from DB after timeout for', jobId);
              this.completeJob(jobId, outs);
              return;
            }
          }
        } catch {}
        
        // Timeout
        throw new Error('CAD generation timed out');
      }

      // Backward-compatible path: immediate output
      if (!first?.output) {
        console.error('LovableAI: No CAD output in response:', cadData);
        throw new Error('No CAD model generated');
      }

      console.log('LovableAI: CAD model generated successfully for', jobId);
      this.completeJob(jobId, Array.isArray(first.output) ? first.output : [first.output]);

    } catch (error) {
      console.error('LovableAI: CAD generation error for', jobId, ':', error);
      throw error;
    }
  }

  private async generateImage(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('LovableAI: Job not found in generateImage:', jobId);
      return;
    }

    console.log('LovableAI: Calling generate-image edge function for', jobId);

    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: job.options.prompt,
          width: job.options.width,
          height: job.options.height,
          numImages: job.options.numImages || 1,
        }
      });

      console.log('LovableAI: Edge function response:', { data, error });

      if (error) {
        console.error('LovableAI: Edge function error:', error);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const httpErr = error as any;
          if (httpErr?.context?.json) {
            const errBody = await httpErr.context.json();
            // Include details field if available for more helpful error messages
            const msg = errBody?.details || errBody?.error || errBody?.message || httpErr.message;
            throw new Error(msg || 'Failed to generate image');
          }
        } catch (_) {
          throw new Error((error as Error).message || 'Failed to generate image');
        }
      }

      if (!data || !data.images || data.images.length === 0) {
        console.error('LovableAI: No images in response:', data);
        throw new Error('No images generated');
      }

      console.log('LovableAI: Generated', data.images.length, 'images for', jobId);

      // Complete the job with the generated images
      this.completeJob(jobId, data.images);

    } catch (error) {
      console.error('LovableAI: Image generation error for', jobId, ':', error);
      throw error;
    }
  }

  private completeJob(jobId: string, outputs: string[]) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const updatedJob: Job = {
      ...job,
      status: 'completed',
      progress: {
        stage: 'completed',
        progress: 100,
        message: 'Generation complete!',
      },
      outputs,
      completedAt: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    this.notifyUpdate(jobId, updatedJob);
  }

  private failJob(jobId: string, error: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const updatedJob: Job = {
      ...job,
      status: 'failed',
      error,
      progress: {
        ...job.progress,
        message: `Error: ${error}`,
      },
    };

    this.jobs.set(jobId, updatedJob);
    this.notifyUpdate(jobId, updatedJob);
  }

  private updateJobStage(jobId: string, stage: JobStatus, message: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const updatedJob: Job = {
      ...job,
      status: stage,
      progress: {
        ...job.progress,
        stage,
        progress: stage === 'running' ? 50 : 0,
        message,
      },
      startedAt: job.startedAt || new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    this.notifyUpdate(jobId, updatedJob);
  }

  onJobUpdate(jobId: string, callback: JobUpdateCallback) {
    this.callbacks.set(jobId, callback);
  }

  private notifyUpdate(jobId: string, job: Job) {
    const callback = this.callbacks.get(jobId);
    if (callback) {
      callback(job);
    }
  }

  cancelJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'completed' && job.status !== 'failed') {
      console.log('LovableAI: Cancelling job:', jobId);
      this.cancelledJobs.add(jobId);
      
      // Update job status immediately so polling loop sees it
      this.failJob(jobId, 'Cancelled by user');
      
      // If there's a prediction running, cancel it on Replicate
      const predictionId = this.predictionIds.get(jobId);
      if (predictionId) {
        console.log('LovableAI: Cancelling Replicate prediction:', predictionId);
        
        // Determine which edge function to call based on job type
        const functionName = job.options.type === 'cad' ? 'generate-cad' : 'generate-3d';
        
        supabase.functions.invoke(functionName, {
          body: {
            cancel: true,
            predictionId: predictionId,
            jobId: jobId,
          }
        }).then(({ error }) => {
          if (error) {
            console.error('LovableAI: Failed to cancel prediction:', error);
          } else {
            console.log('LovableAI: Prediction cancelled successfully');
          }
        });
        
        // Clean up prediction ID
        this.predictionIds.delete(jobId);
      }
    }
  }
}

export const lovableAIService = new LovableAIService();
