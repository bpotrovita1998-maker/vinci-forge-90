-- Create character_references table for storing reusable character references
CREATE TABLE public.character_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.character_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own characters"
  ON public.character_references
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters"
  ON public.character_references
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON public.character_references
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
  ON public.character_references
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_character_references_updated_at
  BEFORE UPDATE ON public.character_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();