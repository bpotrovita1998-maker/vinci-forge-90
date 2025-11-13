import { GenerationOptions, Job, JobStatus, JobManifest } from '@/types/job';

type JobUpdateCallback = (job: Job) => void;

class MockGenerationService {
  private jobs: Map<string, Job> = new Map();
  private callbacks: Map<string, JobUpdateCallback> = new Map();
  private processingQueue: string[] = [];
  private isProcessing = false;

  async submitJob(options: GenerationOptions, jobId?: string): Promise<string> {
    const actualJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: actualJobId,
      options,
      status: 'queued',
      progress: {
        stage: 'queued',
        progress: 0,
        message: 'Waiting in queue...',
      },
      outputs: [],
      createdAt: new Date(),
    };

    this.jobs.set(actualJobId, job);
    this.processingQueue.push(actualJobId);
    
    // Start processing queue
    if (!this.isProcessing) {
      this.processQueue();
    }

    return actualJobId;
  }

  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const jobId = this.processingQueue.shift()!;
      const job = this.jobs.get(jobId);
      
      if (job && job.status === 'queued') {
        await this.processJob(jobId);
      }
    }
    
    this.isProcessing = false;
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Stage 1: Running (generation)
      await this.updateJobStage(jobId, 'running', 'Generating base content...');
      await this.simulateGeneration(jobId);

      // Stage 2: Upscaling
      if (job.options.type !== '3d') {
        await this.updateJobStage(jobId, 'upscaling', 'Upscaling to Full HD...');
        await this.simulateUpscaling(jobId);
      }

      // Stage 3: Encoding (for video)
      if (job.options.type === 'video') {
        await this.updateJobStage(jobId, 'encoding', 'Encoding video with NVENC...');
        await this.simulateEncoding(jobId);
      }

      // Complete
      await this.completeJob(jobId);
      
    } catch (error) {
      this.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async simulateGeneration(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const steps = job.options.steps || 20;
    const duration = this.getEstimatedDuration(job.options);
    const stepTime = (duration * 0.6) / steps; // 60% of time for generation

    for (let i = 0; i <= steps; i++) {
      await this.sleep(stepTime * 1000);
      
      const progress = (i / steps) * 100;
      this.updateJobProgress(jobId, {
        stage: 'running',
        progress,
        currentStep: i,
        totalSteps: steps,
        eta: Math.round((steps - i) * stepTime + duration * 0.4),
        message: `Generating... Step ${i}/${steps}`,
      });
    }
  }

  private async simulateUpscaling(jobId: string) {
    const duration = 3; // 3 seconds for upscaling
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      await this.sleep((duration / steps) * 1000);
      
      const progress = (i / steps) * 100;
      this.updateJobProgress(jobId, {
        stage: 'upscaling',
        progress,
        eta: Math.round((steps - i) * (duration / steps)),
        message: `Upscaling to 1920x1080... ${Math.round(progress)}%`,
      });
    }
  }

  private async simulateEncoding(jobId: string) {
    const duration = 2; // 2 seconds for encoding
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      await this.sleep((duration / steps) * 1000);
      
      const progress = (i / steps) * 100;
      this.updateJobProgress(jobId, {
        stage: 'encoding',
        progress,
        eta: Math.round((steps - i) * (duration / steps)),
        message: `Encoding with NVENC H.265... ${Math.round(progress)}%`,
      });
    }
  }

  private getEstimatedDuration(options: GenerationOptions): number {
    // Simulate realistic timings
    if (options.type === 'image') {
      return 8 + (options.numImages || 1) * 3; // 8-15s for images
    } else if (options.type === 'video') {
      const duration = options.duration || 5;
      return 15 + duration * 4; // ~4s per second of video
    } else {
      return 25; // 3D takes longer
    }
  }

  private async completeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Generate mock outputs
    const outputs = await this.generateMockOutputs(job.options);
    
    // Create manifest
    const manifest: JobManifest = {
      jobId,
      prompt: job.options.prompt,
      negativePrompt: job.options.negativePrompt,
      type: job.options.type,
      settings: job.options,
      modelHash: 'sd15_' + Math.random().toString(36).substr(2, 9),
      pipelineVersion: '1.0.0-mock',
      createdAt: job.createdAt.toISOString(),
      completedAt: new Date().toISOString(),
    };

    const updatedJob: Job = {
      ...job,
      status: 'completed',
      progress: {
        stage: 'completed',
        progress: 100,
        message: 'Generation complete!',
      },
      outputs,
      manifest,
      completedAt: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    this.notifyUpdate(jobId, updatedJob);
  }

  private async generateMockOutputs(options: GenerationOptions): Promise<string[]> {
    // For now, return placeholder URLs
    // In a real implementation, you might generate actual images using a client-side model
    if (options.type === 'image') {
      const count = options.numImages || 1;
      return Array.from({ length: count }, (_, i) => 
        `https://picsum.photos/seed/${Date.now()}_${i}/${options.width}/${options.height}`
      );
    } else if (options.type === 'video') {
      // Return a placeholder video URL
      return [`https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`];
    } else {
      // 3D placeholder
      return [`https://picsum.photos/seed/${Date.now()}/800/600`];
    }
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
        progress: 0,
        message,
      },
      startedAt: job.startedAt || new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    this.notifyUpdate(jobId, updatedJob);
  }

  private updateJobProgress(jobId: string, progress: Job['progress']) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const updatedJob: Job = {
      ...job,
      progress,
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
    this.processingQueue = this.processingQueue.filter(id => id !== jobId);
    // The actual job status update is handled by the context
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockGenerationService = new MockGenerationService();
