-- Migration 002 — Fix RLS: allow anon role (unauthenticated players)
-- Bolt.new generated policies with TO authenticated only, which blocks
-- players who join without a Supabase login (anon key access).

-- Sessions
DROP POLICY IF EXISTS "select_sessions" ON sessions;
DROP POLICY IF EXISTS "insert_sessions" ON sessions;
DROP POLICY IF EXISTS "update_sessions" ON sessions;

CREATE POLICY "select_sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "insert_sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "update_sessions" ON sessions FOR UPDATE USING (true) WITH CHECK (true);

-- Teams
DROP POLICY IF EXISTS "select_teams" ON teams;
DROP POLICY IF EXISTS "insert_teams" ON teams;
DROP POLICY IF EXISTS "update_teams" ON teams;

CREATE POLICY "select_teams" ON teams FOR SELECT USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "update_teams" ON teams FOR UPDATE USING (true) WITH CHECK (true);

-- Decisions
DROP POLICY IF EXISTS "select_decisions" ON decisions;
DROP POLICY IF EXISTS "insert_decisions" ON decisions;
DROP POLICY IF EXISTS "update_decisions" ON decisions;

CREATE POLICY "select_decisions" ON decisions FOR SELECT USING (true);
CREATE POLICY "insert_decisions" ON decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "update_decisions" ON decisions FOR UPDATE USING (true) WITH CHECK (true);

-- Results
DROP POLICY IF EXISTS "select_results" ON results;
DROP POLICY IF EXISTS "insert_results" ON results;
DROP POLICY IF EXISTS "update_results" ON results;

CREATE POLICY "select_results" ON results FOR SELECT USING (true);
CREATE POLICY "insert_results" ON results FOR INSERT WITH CHECK (true);
CREATE POLICY "update_results" ON results FOR UPDATE USING (true) WITH CHECK (true);

-- Market events
DROP POLICY IF EXISTS "select_market_events" ON market_events;
DROP POLICY IF EXISTS "insert_market_events" ON market_events;
DROP POLICY IF EXISTS "update_market_events" ON market_events;

CREATE POLICY "select_market_events" ON market_events FOR SELECT USING (true);
CREATE POLICY "insert_market_events" ON market_events FOR INSERT WITH CHECK (true);
CREATE POLICY "update_market_events" ON market_events FOR UPDATE USING (true) WITH CHECK (true);
