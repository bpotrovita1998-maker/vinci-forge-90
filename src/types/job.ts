export type JobType = 'image' | 'video' | '3d' | 'cad';
export type JobStatus = 'queued' | 'running' | 'upscaling' | 'encoding' | 'completed' | 'failed';
export type VideoMode = 'short' | 'long';
export type ThreeDMode = 'none' | 'stereoscopic' | 'object';

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  type: JobType;
  
  // Image/Video options
  width: number;
  height: number;
  
  // Video options
  duration?: number; // seconds
  fps?: number;
  videoMode?: VideoMode;
  
  // 3D options
  threeDMode: ThreeDMode;
  
  // Advanced
  seed?: number;
  steps?: number;
  cfgScale?: number;
  numImages?: number; // for image generation
}

export interface JobManifest {
  jobId: string;
  prompt: string;
  negativePrompt?: string;
  type: JobType;
  settings: GenerationOptions;
  modelHash: string;
  pipelineVersion: string;
  createdAt: string;
  completedAt?: string;
}

export interface JobProgress {
  stage: JobStatus;
  progress: number; // 0-100
  currentStep?: number;
  totalSteps?: number;
  eta?: number; // seconds
  message?: string;
}

export interface Job {
  id: string;
  userId?: string;
  options: GenerationOptions;
  status: JobStatus;
  progress: JobProgress;
  outputs: string[]; // URLs to generated files
  manifest?: JobManifest;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
