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
  duration?: number; // seconds (4, 6, or 8 for Veo 3.1)
  fps?: number;
  videoMode?: VideoMode;
  videoModel?: 'veo' | 'haiper' | 'animatediff'; // Model selection: premium Veo 3.1, balanced Haiper, or budget AnimateDiff
  numVideos?: number; // for video generation
  upscaleVideo?: boolean; // upscale to 4K with 60fps
  scenePrompts?: string[]; // for multi-part video generation
  aspectRatio?: string; // aspect ratio for video (16:9, 9:16)
  resolution?: '720p' | '1080p'; // video resolution (Veo 3.1)
  
  // Veo 3.1 specific options
  referenceImages?: string[]; // Up to 3 reference images for video generation
  startFrame?: string; // Starting frame for frame-to-frame generation
  endFrame?: string; // Ending frame for frame-to-frame generation
  extendFromVideo?: string; // Video URL to extend from
  
  // 3D options
  threeDMode: ThreeDMode;
  
  // Advanced
  seed?: number;
  steps?: number;
  cfgScale?: number;
  numImages?: number; // for image generation
  upscaleQuality?: 2 | 4 | 8; // upscaling multiplier
  
  // Image input
  imageUrl?: string; // For image-to-X generation (primary image)
  imageUrls?: string[]; // For multiple image inputs
  imageFormat?: 'png' | 'jpeg' | 'webp'; // Target format for uploaded images
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
  scenePrompts?: string[];
  currentSceneIndex?: number;
  sceneProgress?: Record<number, {
    status: 'pending' | 'running' | 'completed';
    progress: number;
    startedAt?: string;
    completedAt?: string;
  }>;
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
  compressed_outputs?: string[]; // URLs to compressed/optimized files for display
  manifest?: JobManifest;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
