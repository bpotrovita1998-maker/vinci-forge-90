-- Add columns to jobs table to store compressed versions of outputs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS compressed_outputs JSON DEFAULT '[]'::json;

-- Add comment explaining the column
COMMENT ON COLUMN public.jobs.compressed_outputs IS 'Array of compressed/optimized file URLs for UI display. Original files in outputs column remain for download.';
