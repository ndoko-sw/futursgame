-- Add 100k€ budget allocation columns to decisions table
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS budget_fournisseur INTEGER NOT NULL DEFAULT 0 CHECK (budget_fournisseur >= 0),
  ADD COLUMN IF NOT EXISTS budget_collection INTEGER NOT NULL DEFAULT 0 CHECK (budget_collection >= 0),
  ADD COLUMN IF NOT EXISTS budget_distribution INTEGER NOT NULL DEFAULT 0 CHECK (budget_distribution >= 0),
  ADD COLUMN IF NOT EXISTS budget_communication INTEGER NOT NULL DEFAULT 0 CHECK (budget_communication >= 0);
