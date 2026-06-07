-- Add columns that may be missing if match_participants was created before 20260531
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS payment_method       text,
  ADD COLUMN IF NOT EXISTS checked_requirements text[] NOT NULL DEFAULT '{}';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
