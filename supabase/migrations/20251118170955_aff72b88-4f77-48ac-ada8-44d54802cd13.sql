-- Add SELECT policy for generated-models bucket so users can view their own files
CREATE POLICY "Users can view their files in generated-models"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'generated-models' 
  AND auth.role() = 'authenticated'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Also add a policy to allow public read access to signed URLs
CREATE POLICY "Public read access for signed URLs in generated-models"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-models');