-- Add index for faster job queries by user
CREATE INDEX IF NOT EXISTS idx_jobs_user_created 
ON public.jobs (user_id, created_at DESC);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_user_status 
ON public.jobs (user_id, status);

-- Analyze the table to update statistics for query planner
ANALYZE public.jobs;