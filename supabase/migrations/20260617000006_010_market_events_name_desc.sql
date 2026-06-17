-- Migration 010 — Add name + description columns to market_events
-- Code uses these fields but DB only had title_fr/description_fr

ALTER TABLE market_events
  ADD COLUMN IF NOT EXISTS name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS description TEXT;

NOTIFY pgrst, 'reload schema';
