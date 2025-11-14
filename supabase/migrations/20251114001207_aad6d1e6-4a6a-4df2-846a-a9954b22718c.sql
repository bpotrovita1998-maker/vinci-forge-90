-- Add video_url column to storyboard_scenes table
ALTER TABLE public.storyboard_scenes 
ADD COLUMN IF NOT EXISTS video_url TEXT;