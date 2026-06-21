ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sport_levels jsonb DEFAULT '{}'::jsonb;
