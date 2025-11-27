-- Create video_scenes table to store individual scene metadata
CREATE TABLE IF NOT EXISTS public.video_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scene_index INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 8,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, scene_index)
);

-- Create long_videos table for stitched videos (5TB storage capacity)
CREATE TABLE IF NOT EXISTS public.long_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stitched_video_url TEXT NOT NULL,
  total_duration INTEGER NOT NULL,
  scene_count INTEGER NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Enable RLS on video_scenes
ALTER TABLE public.video_scenes ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_scenes
CREATE POLICY "Users can view their own scenes"
  ON public.video_scenes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenes"
  ON public.video_scenes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenes"
  ON public.video_scenes FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on long_videos
ALTER TABLE public.long_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for long_videos
CREATE POLICY "Users can view their own long videos"
  ON public.long_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own long videos"
  ON public.long_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own long videos"
  ON public.long_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own long videos"
  ON public.long_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at on long_videos
CREATE TRIGGER update_long_videos_updated_at
  BEFORE UPDATE ON public.long_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_scenes_job_id ON public.video_scenes(job_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_user_id ON public.video_scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_long_videos_job_id ON public.long_videos(job_id);
CREATE INDEX IF NOT EXISTS idx_long_videos_user_id ON public.long_videos(user_id);