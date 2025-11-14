import { GenerationOptions, Job, JobStatus } from '@/types/job';
import { supabase } from '@/integrations/supabase/client';

type JobUpdateCallback = (job: Job) => void;

class LovableAIService {
  private jobs: Map<string, Job> = new Map();
  private callbacks: Map<string, JobUpdateCallback> = new Map();

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

    console.log('LovableAI: Generating video with Replicate for', jobId);

    try {
      // Step 1: Generate a key frame image first
      this.updateJobStage(jobId, 'running', 'Generating key frame...');
      
      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `Cinematic ${job.options.prompt}. High-quality video frame, professional cinematography, 4K resolution.`,
          width: job.options.width,
          height: job.options.height,
          numImages: 1,
        }
      });

      if (imageError || !imageData?.images?.[0]) {
        throw new Error('Failed to generate key frame');
      }

      console.log('LovableAI: Key frame generated, starting video generation');
      
      // Step 2: Convert image to video using Replicate
      this.updateJobStage(jobId, 'encoding', 'Converting to video...');
      
      const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: job.options.prompt,
          inputImage: imageData.images[0],
          fps: job.options.fps || 6,
        }
      });

      console.log('LovableAI: Video generation response:', { videoData, videoError });

      if (videoError) {
        console.error('LovableAI: Video generation error:', videoError);
        try {
          // Parse structured error from edge function
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const httpErr = videoError as any;
          if (httpErr?.context?.json) {
            const errBody = await httpErr.context.json();
            const msg = errBody?.error || errBody?.message || httpErr.message;
            throw new Error(msg || 'Failed to generate video');
          }
        } catch (_) {
          // Fallback to message
          throw new Error((videoError as Error).message || 'Failed to generate video');
        }
      }

      if (!videoData?.output) {
        console.error('LovableAI: No video output in response:', videoData);
        throw new Error('No video generated');
      }

      console.log('LovableAI: Video generated successfully for', jobId);

      // Complete the job with the video URL
      this.completeJob(jobId, Array.isArray(videoData.output) ? videoData.output : [videoData.output]);

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

    console.log('LovableAI: Generating 3D model with Replicate for', jobId);

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

      console.log('LovableAI: Reference image generated, converting to 3D');
      
      // Step 2: Convert image to 3D using Replicate TRELLIS
      this.updateJobStage(jobId, 'upscaling', 'Converting to 3D mesh...');
      
      const { data: threeDData, error: threeDError } = await supabase.functions.invoke('generate-3d', {
        body: {
          inputImage: imageData.images[0],
          seed: job.options.seed,
          jobId: jobId, // Pass jobId so edge function can update database
        }
      });

      console.log('LovableAI: 3D generation response:', { threeDData, threeDError });

      if (threeDError) {
        console.error('LovableAI: 3D generation error:', threeDError);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const httpErr = threeDError as any;
          if (httpErr?.context?.json) {
            const errBody = await httpErr.context.json();
            const msg = errBody?.error || errBody?.message || httpErr.message;
            throw new Error(msg || 'Failed to generate 3D model');
          }
        } catch (_) {
          throw new Error((threeDError as Error).message || 'Failed to generate 3D model');
        }
      }

      if (!threeDData?.output) {
        console.error('LovableAI: No 3D output in response:', threeDData);
        throw new Error('No 3D model generated');
      }

      console.log('LovableAI: 3D model generated successfully for', jobId);

      // Complete the job with the 3D model URL
      this.completeJob(jobId, Array.isArray(threeDData.output) ? threeDData.output : [threeDData.output]);

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

        // Poll the edge function for status until completion/failure
        const start = Date.now();
        const timeoutMs = 10 * 60 * 1000; // 10 minutes max
        let delay = 2000; // 2s initial

        while (Date.now() - start < timeoutMs) {
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

          if (status === 'succeeded' && outputUrl) {
            console.log('LovableAI: CAD model ready for', jobId, outputUrl);
            this.completeJob(jobId, [outputUrl]);
            return;
          }

          if (status === 'failed' || status === 'canceled') {
            throw new Error('CAD generation failed');
          }

          // Keep waiting
          await new Promise((r) => setTimeout(r, delay));
          // Optional: exponential backoff up to 10s
          delay = Math.min(delay * 1.25, 10000);
        }

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
      this.failJob(jobId, 'Cancelled by user');
    }
  }
}

export const lovableAIService = new LovableAIService();
