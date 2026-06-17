-- Match photos table + RLS.
-- Storage bucket "match-photos" must be created manually in the Supabase Dashboard
-- (Storage → New bucket → "match-photos", Public).

CREATE TABLE IF NOT EXISTS public.match_photos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id     UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  uploader_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS match_photos_match_id_idx ON public.match_photos(match_id);

ALTER TABLE public.match_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos (match is public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'match_photos' AND policyname = 'match_photos: read'
  ) THEN
    CREATE POLICY "match_photos: read"
      ON public.match_photos FOR SELECT USING (true);
  END IF;
END $$;

-- Authenticated user can insert their own photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'match_photos' AND policyname = 'match_photos: insert own'
  ) THEN
    CREATE POLICY "match_photos: insert own"
      ON public.match_photos FOR INSERT WITH CHECK (auth.uid() = uploader_id);
  END IF;
END $$;

-- Uploader can delete their own photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'match_photos' AND policyname = 'match_photos: delete own'
  ) THEN
    CREATE POLICY "match_photos: delete own"
      ON public.match_photos FOR DELETE USING (auth.uid() = uploader_id);
  END IF;
END $$;
