-- Ajouter colonnes à round_results
ALTER TABLE round_results
  ADD COLUMN IF NOT EXISTS investor_grade TEXT DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS subsidy_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_scores JSONB DEFAULT '{}';

-- On essaie aussi sur la table "results" (nom effectif)
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS investor_grade TEXT DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS subsidy_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_scores JSONB DEFAULT '{}';

-- Table événements individuels par équipe
CREATE TABLE IF NOT EXISTS team_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description_fr TEXT,
  effect_json JSONB NOT NULL DEFAULT '[]',
  triggered_by TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "team_events_select" ON team_events FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "team_events_insert" ON team_events FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "team_events_delete" ON team_events FOR DELETE USING (true);
