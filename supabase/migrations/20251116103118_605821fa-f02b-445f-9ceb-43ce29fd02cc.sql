-- Add performance index for job queries
-- This will dramatically speed up the query that's timing out
CREATE INDEX IF NOT EXISTS idx_jobs_user_created 
ON public.jobs (user_id, created_at DESC);

-- Add comment explaining the index
COMMENT ON INDEX idx_jobs_user_created IS 'Optimizes job history queries filtered by user_id and ordered by created_at';