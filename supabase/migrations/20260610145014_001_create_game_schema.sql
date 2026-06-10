-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'practice', 'active', 'paused', 'finished')),
  current_round INTEGER DEFAULT 0,
  round_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  brand_name VARCHAR(50) NOT NULL,
  brand_color VARCHAR(7) NOT NULL DEFAULT '#E63329',
  brand_statement TEXT,
  cumulative_score NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round >= 0 AND round <= 5),
  supplier VARCHAR(30) NOT NULL,
  collection_style VARCHAR(20) NOT NULL,
  collection_volume INTEGER NOT NULL CHECK (collection_volume >= 0 AND collection_volume <= 100),
  price INTEGER NOT NULL CHECK (price >= 0 AND price <= 100),
  distribution VARCHAR(30) NOT NULL,
  comm_budget INTEGER NOT NULL CHECK (comm_budget >= 0 AND comm_budget <= 100),
  comm_channel VARCHAR(30) NOT NULL,
  brand_focus VARCHAR(20) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, round)
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round >= 0 AND round <= 5),
  sales NUMERIC(8,2) NOT NULL DEFAULT 0,
  image_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  sustainability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  loyalty_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  brand_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  market_share NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(team_id, round)
);

-- Market events table
CREATE TABLE IF NOT EXISTS market_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  effect_json JSONB NOT NULL DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;

-- Sessions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='select_sessions') THEN
    CREATE POLICY "select_sessions" ON sessions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='insert_sessions') THEN
    CREATE POLICY "insert_sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='update_sessions') THEN
    CREATE POLICY "update_sessions" ON sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Teams policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='select_teams') THEN
    CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='insert_teams') THEN
    CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='update_teams') THEN
    CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Decisions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='decisions' AND policyname='select_decisions') THEN
    CREATE POLICY "select_decisions" ON decisions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='decisions' AND policyname='insert_decisions') THEN
    CREATE POLICY "insert_decisions" ON decisions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='decisions' AND policyname='update_decisions') THEN
    CREATE POLICY "update_decisions" ON decisions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Results policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='results' AND policyname='select_results') THEN
    CREATE POLICY "select_results" ON results FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='results' AND policyname='insert_results') THEN
    CREATE POLICY "insert_results" ON results FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='results' AND policyname='update_results') THEN
    CREATE POLICY "update_results" ON results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Market events policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_events' AND policyname='select_market_events') THEN
    CREATE POLICY "select_market_events" ON market_events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_events' AND policyname='insert_market_events') THEN
    CREATE POLICY "insert_market_events" ON market_events FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_events' AND policyname='update_market_events') THEN
    CREATE POLICY "update_market_events" ON market_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE results;
ALTER PUBLICATION supabase_realtime ADD TABLE market_events;
