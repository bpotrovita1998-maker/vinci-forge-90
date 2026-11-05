CREATE OR REPLACE FUNCTION public.jobs_with_base64_outputs(_limit integer)
RETURNS TABLE (id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT j.id FROM public.jobs j
  WHERE left(j.outputs::text, 40) LIKE '%data:image%'
     OR left(j.compressed_outputs::text, 40) LIKE '%data:image%'
     OR j.outputs::text LIKE '%"data:image%'
  LIMIT _limit
$$;
REVOKE ALL ON FUNCTION public.jobs_with_base64_outputs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jobs_with_base64_outputs(integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON public.jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_files_user ON public.user_files (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_job_ref ON public.usage_logs ((cost_breakdown->>'job_ref'));