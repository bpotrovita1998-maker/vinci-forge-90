import { GenerationOptions, Job, JobStatus } from '@/types/job';
import { supabase } from '@/integrations/supabase/client';

type JobUpdateCallback = (job: Job) => void;

class LovableAIService {
  private jobs: Map<string, Job> = new Map();
  private callbacks: Map<string, JobUpdateCallback> = new Map();

  async submitJob(options: GenerationOptions): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
    this.processJob(jobId);

    return jobId;
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update to running
      this.updateJobStage(jobId, 'running', 'Generating with AI...');

      // Only handle image generation for now
      if (job.options.type === 'image') {
        await this.generateImage(jobId);
      } else if (job.options.type === 'video') {
        // Video generation not yet implemented
        this.failJob(jobId, 'Video generation not yet implemented with Lovable AI');
      } else if (job.options.type === '3d') {
        // 3D generation not yet implemented
        this.failJob(jobId, '3D generation not yet implemented with Lovable AI');
      }
      
    } catch (error) {
      console.error('Job processing error:', error);
      this.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async generateImage(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

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

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate image');
      }

      if (!data || !data.images || data.images.length === 0) {
        throw new Error('No images generated');
      }

      // Complete the job with the generated images
      this.completeJob(jobId, data.images);

    } catch (error) {
      console.error('Image generation error:', error);
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
