-- Create storyboards table
CREATE TABLE public.storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storyboard_scenes table
CREATE TABLE public.storyboard_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  job_id UUID,
  duration INTEGER NOT NULL DEFAULT 3,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on storyboards
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on storyboard_scenes
ALTER TABLE public.storyboard_scenes ENABLE ROW LEVEL SECURITY;

-- RLS policies for storyboards
CREATE POLICY "Users can view their own storyboards"
  ON public.storyboards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own storyboards"
  ON public.storyboards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storyboards"
  ON public.storyboards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storyboards"
  ON public.storyboards
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for storyboard_scenes
CREATE POLICY "Users can view scenes from their storyboards"
  ON public.storyboard_scenes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.storyboards
      WHERE storyboards.id = storyboard_scenes.storyboard_id
      AND storyboards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scenes to their storyboards"
  ON public.storyboard_scenes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.storyboards
      WHERE storyboards.id = storyboard_scenes.storyboard_id
      AND storyboards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scenes in their storyboards"
  ON public.storyboard_scenes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.storyboards
      WHERE storyboards.id = storyboard_scenes.storyboard_id
      AND storyboards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scenes from their storyboards"
  ON public.storyboard_scenes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.storyboards
      WHERE storyboards.id = storyboard_scenes.storyboard_id
      AND storyboards.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_storyboards_updated_at
  BEFORE UPDATE ON public.storyboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_storyboard_scenes_updated_at
  BEFORE UPDATE ON public.storyboard_scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for better query performance
CREATE INDEX idx_storyboard_scenes_storyboard_id ON public.storyboard_scenes(storyboard_id);
CREATE INDEX idx_storyboard_scenes_order ON public.storyboard_scenes(storyboard_id, order_index);