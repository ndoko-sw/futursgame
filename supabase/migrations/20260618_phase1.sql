-- Décisions de marque enrichies
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS brand_positioning TEXT DEFAULT 'contemporain',
  ADD COLUMN IF NOT EXISTS brand_value TEXT DEFAULT 'panafricain',
  ADD COLUMN IF NOT EXISTS notoriety_budget INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_commitment INTEGER DEFAULT 0;

-- Stats de marque persistantes
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS brand_equity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hype INTEGER DEFAULT 0;

-- Résultats : flags leader + revue presse + détails marché
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS leader_kpis JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS press_reviews JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supplier_status TEXT DEFAULT 'ok';

-- Annonces GM → joueurs
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  kind TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "broadcasts_all" ON broadcasts;
CREATE POLICY "broadcasts_all" ON broadcasts FOR ALL USING (true) WITH CHECK (true);
