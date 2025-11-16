-- Add storage tracking to user accounts
ALTER TABLE public.token_balances
ADD COLUMN IF NOT EXISTS storage_bytes_used bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit_bytes bigint DEFAULT 8589934592; -- 8GB in bytes

-- Create table to track individual files for cleanup
CREATE TABLE IF NOT EXISTS public.user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_type text NOT NULL, -- 'image', 'video', '3d', 'cad'
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '90 days')
);

-- Enable RLS
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_files
CREATE POLICY "Users can view their own files"
  ON public.user_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.user_files FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert files"
  ON public.user_files FOR INSERT
  WITH CHECK (true);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_files_expires_at ON public.user_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON public.user_files(user_id);

-- Function to check if user has storage space
CREATE OR REPLACE FUNCTION public.check_storage_quota(_user_id uuid, _file_size_bytes bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage bigint;
  storage_limit bigint;
BEGIN
  -- Admins have unlimited storage
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  
  SELECT storage_bytes_used, storage_limit_bytes
  INTO current_usage, storage_limit
  FROM public.token_balances
  WHERE user_id = _user_id;
  
  -- Check if adding this file would exceed quota
  RETURN (current_usage + _file_size_bytes) <= storage_limit;
END;
$$;