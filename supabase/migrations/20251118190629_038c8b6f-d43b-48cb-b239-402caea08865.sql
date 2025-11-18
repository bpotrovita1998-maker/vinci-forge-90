-- Make the generated-models bucket public for permanent URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-models';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for generated models" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own models" ON storage.objects;

-- Create storage policies for public read access
CREATE POLICY "Public read access for generated models"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-models');

-- Users can upload their own models
CREATE POLICY "Users can upload their own models"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own models
CREATE POLICY "Users can update their own models"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own models
CREATE POLICY "Users can delete their own models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);