CREATE TABLE IF NOT EXISTS team_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  mission_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward INTEGER DEFAULT 8,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE team_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_missions_all" ON team_missions;
CREATE POLICY "team_missions_all" ON team_missions FOR ALL USING (true) WITH CHECK (true);
