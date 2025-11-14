-- Add 'cad' to the jobs type check constraint
ALTER TABLE public.jobs 
DROP CONSTRAINT IF EXISTS jobs_type_check;

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_type_check 
CHECK (type IN ('image', 'video', '3d', 'cad'));