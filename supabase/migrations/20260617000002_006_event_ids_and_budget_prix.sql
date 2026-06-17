-- Migration 006 — Fix event tracking + budget_prix column

-- Stocke tous les événements actifs d'un tour (pas seulement le premier)
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS event_ids TEXT[] DEFAULT '{}';

-- Colonne budget_prix manquante dans la migration 003
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS budget_prix INTEGER NOT NULL DEFAULT 0 CHECK (budget_prix >= 0);
