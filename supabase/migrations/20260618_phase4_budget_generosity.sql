-- Phase 4 — Générosité du réinvestissement budgétaire (tours 2+)
-- Coefficient g réglé par le GM dès le début de la partie.
-- 1.0 = équilibré ; < 1 plus sévère ; > 1 plus généreux.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS budget_generosity real DEFAULT 1.0;
