import { GenerationOptions, Job, JobStatus } from '@/types/job';
import { supabase } from '@/integrations/supabase/client';

type JobUpdateCallback = (job: Job) => void;

class LovableAIService {
  private jobs: Map<string, Job> = new Map();
  private callbacks: Map<string, JobUpdateCallback> = new Map();

  async submitJob(options: GenerationOptions): Promise<string> {
    // Generate a proper UUID for database compatibility
    const jobId = crypto.randomUUID();
    
    console.log('LovableAI: Submitting job', jobId, options);
    
    const job: Job = {
      id: jobId,
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

    this.jobs.set(jobId, job);
    
    // Start processing immediately
    console.log('LovableAI: Starting processJob for', jobId);
    this.processJob(jobId).catch(error => {
      console.error('LovableAI: processJob failed:', error);
      this.failJob(jobId, error.message);
    });

    return jobId;
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
        // 3D generation: Generate a preview image
        console.log('LovableAI: Generating 3D preview for', jobId);
        await this.generateImage(jobId);
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

    console.log('LovableAI: Generating video frames for', jobId);

    try {
      // For video, generate a high-quality key frame (simulating video with image)
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: `Cinematic ${job.options.prompt}. High-quality video frame, professional cinematography, 4K resolution.`,
          width: job.options.width,
          height: job.options.height,
          numImages: 1,
        }
      });

      console.log('LovableAI: Video frame generation response:', { data, error });

      if (error) {
        console.error('LovableAI: Edge function error:', error);
        throw new Error(error.message || 'Failed to generate video frame');
      }

      if (!data || !data.images || data.images.length === 0) {
        console.error('LovableAI: No images in response:', data);
        throw new Error('No video frames generated');
      }

      console.log('LovableAI: Generated video preview for', jobId);

      // Complete the job with the generated frame
      this.completeJob(jobId, data.images);

    } catch (error) {
      console.error('LovableAI: Video generation error for', jobId, ':', error);
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
        throw new Error(error.message || 'Failed to generate image');
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
