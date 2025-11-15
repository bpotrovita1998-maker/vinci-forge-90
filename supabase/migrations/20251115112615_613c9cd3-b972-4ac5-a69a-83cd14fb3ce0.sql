-- Create a public bucket for generated 3D/CAD models (idempotent)
insert into storage.buckets (id, name, public)
values ('generated-models', 'generated-models', true)
on conflict (id) do nothing;

-- Create policies only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for generated-models'
  ) THEN
    CREATE POLICY "Public read for generated-models"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'generated-models');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload to their folder in generated-models'
  ) THEN
    CREATE POLICY "Users can upload to their folder in generated-models"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'generated-models'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their files in generated-models'
  ) THEN
    CREATE POLICY "Users can update their files in generated-models"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'generated-models'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their files in generated-models'
  ) THEN
    CREATE POLICY "Users can delete their files in generated-models"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'generated-models'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;