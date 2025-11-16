-- Drop the legacy public read policy that was not removed in previous migration
-- This policy allows unauthenticated access to all files in the generated-models bucket
DROP POLICY IF EXISTS "Public read for generated-models" ON storage.objects;

-- The user-specific policies from migration 20251116150851 are sufficient:
-- - Users can access their own files
-- - Users can upload their own files  
-- - Users can delete their own files