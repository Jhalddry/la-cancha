-- Storage bucket + RLS policies for match-photos.
-- The bucket itself is created here so it doesn't need to be done manually.
-- If already created in Dashboard, the INSERT is a no-op.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'match-photos',
  'match-photos',
  true,
  10485760,   -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (photos are public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'match-photos: public read'
  ) THEN
    CREATE POLICY "match-photos: public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'match-photos');
  END IF;
END $$;

-- Authenticated users can upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'match-photos: authenticated upload'
  ) THEN
    CREATE POLICY "match-photos: authenticated upload"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'match-photos' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Owner can delete their own files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'match-photos: owner delete'
  ) THEN
    CREATE POLICY "match-photos: owner delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'match-photos' AND owner = auth.uid());
  END IF;
END $$;
