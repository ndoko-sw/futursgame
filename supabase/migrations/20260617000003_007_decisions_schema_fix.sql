-- Migration 007 — Add session_id + total_spent to decisions, unique constraint on (team_id, round_number)
-- Note: round_number, brand_focus, submitted_at, price_tier, budget_* already exist in this DB

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decisions_team_round_number_unique') THEN
    ALTER TABLE decisions ADD CONSTRAINT decisions_team_round_number_unique UNIQUE (team_id, round_number);
  END IF;
END $$;
