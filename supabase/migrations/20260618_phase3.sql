-- Phase 3 : timer contrôlable (GM) + collaborations inter-équipes

-- ── Section 4 — Timer contrôlable ────────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS round_duration_seconds INTEGER DEFAULT 600;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_remaining_seconds INTEGER;

-- ── Section 6 — Collaborations inter-équipes ─────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS collab_enabled BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS collaborations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  proposer_team UUID REFERENCES teams(id) ON DELETE CASCADE,
  partner_team UUID REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborations_all" ON collaborations;
CREATE POLICY "collaborations_all" ON collaborations FOR ALL USING (true) WITH CHECK (true);
