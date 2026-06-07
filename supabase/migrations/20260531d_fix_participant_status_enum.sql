-- ============================================================
-- Fix participant_status enum (add missing values)
-- and ensure all required columns exist
-- ============================================================

-- 1. Add 'pending' and 'rejected' to the enum if it exists
DO $$
BEGIN
  -- Add 'pending' if missing
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_status') THEN
    BEGIN
      ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'pending';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'rejected';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. If status column is enum, convert to text (simpler, no enum maintenance)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    JOIN pg_type t ON t.typname = data_type OR t.typname = udt_name
    WHERE c.table_name = 'match_participants'
      AND c.column_name = 'status'
      AND c.udt_name != 'text'
  ) THEN
    -- Convert enum column to text, preserving values and constraint
    ALTER TABLE match_participants
      ALTER COLUMN status TYPE text USING status::text;
  END IF;

  -- Ensure check constraint exists with all statuses
  ALTER TABLE match_participants
    DROP CONSTRAINT IF EXISTS match_participants_status_check;
  ALTER TABLE match_participants
    ADD CONSTRAINT match_participants_status_check
    CHECK (status IN ('pending', 'joined', 'left', 'rejected'));
END $$;

-- 3. Add missing columns
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS payment_method       text,
  ADD COLUMN IF NOT EXISTS checked_requirements text[] NOT NULL DEFAULT '{}';

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
