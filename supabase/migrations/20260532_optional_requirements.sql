ALTER TABLE matches ADD COLUMN IF NOT EXISTS optional_requirements text[] NOT NULL DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
