export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe';

export interface SceneConfig {
  id: string;
  videoUrl: string;
  prompt: string;
  duration: number; // in seconds
  trimStart: number; // in seconds
  trimEnd: number; // in seconds
  transitionType: TransitionType;
  transitionDuration: number; // in seconds
  order: number;
}

export interface StitchingOptions {
  scenes: SceneConfig[];
  outputFormat: 'mp4';
  resolution?: 'sd' | 'hd' | '4k';
}
