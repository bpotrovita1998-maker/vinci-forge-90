-- Add columns for multiple video generation and video upscaling
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS num_videos INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS upscale_video BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.jobs.num_videos IS 'Number of videos to generate for the same prompt (max 3)';
COMMENT ON COLUMN public.jobs.upscale_video IS 'Whether to upscale video to 4K with 60fps using ESRGAN';