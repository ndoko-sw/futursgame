-- Migration 005 — Add effect_json (JSONB) and source to market_events

ALTER TABLE market_events
  ADD COLUMN IF NOT EXISTS effect_json JSONB,
  ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'gm';
