-- Migration 007 — Fix decisions table to match code expectations
-- Adds: session_id, round_number, brand_focus, total_spent, submitted_at, product columns
-- Makes old rigid NOT NULL columns nullable (replaced by new flexible schema)

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS round_number INTEGER,
  ADD COLUMN IF NOT EXISTS brand_focus VARCHAR(50) DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS product_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS product_style VARCHAR(50);

-- Populate round_number from round for existing rows
UPDATE decisions SET round_number = round WHERE round_number IS NULL;

-- Make legacy strict columns nullable (new code uses budget_* instead)
ALTER TABLE decisions
  ALTER COLUMN collection_volume DROP NOT NULL,
  ALTER COLUMN price DROP NOT NULL,
  ALTER COLUMN comm_budget DROP NOT NULL,
  ALTER COLUMN supplier SET DEFAULT '',
  ALTER COLUMN collection_style SET DEFAULT '',
  ALTER COLUMN distribution SET DEFAULT '',
  ALTER COLUMN comm_channel SET DEFAULT '';

-- Add unique constraint for upsert on (team_id, round_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'decisions_team_round_number_unique'
  ) THEN
    ALTER TABLE decisions
      ADD CONSTRAINT decisions_team_round_number_unique UNIQUE (team_id, round_number);
  END IF;
END $$;

-- Enable realtime for decisions if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'decisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
  END IF;
END $$;
