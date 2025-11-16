-- Make generated-models bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'generated-models';

-- Create RLS policy for users to access their own files
CREATE POLICY "Users can access their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to insert their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);