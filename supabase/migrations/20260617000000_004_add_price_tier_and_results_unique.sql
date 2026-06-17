-- Migration 004 — Add price_tier to decisions + unique constraint on results

-- price_tier remplace l'ancien champ price (entier) pour le positionnement tarifaire
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(20) DEFAULT 'milieu';

-- Contrainte unique sur results pour éviter les doublons si le GM double-clique
ALTER TABLE results
  DROP CONSTRAINT IF EXISTS results_team_id_round_number_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'results_team_round_unique'
  ) THEN
    ALTER TABLE results ADD CONSTRAINT results_team_round_unique UNIQUE (team_id, round_number);
  END IF;
END $$;
