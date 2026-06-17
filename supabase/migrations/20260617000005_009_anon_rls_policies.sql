-- Migration 009 — Open RLS to anon role (game uses anon key, no auth)
-- Without this, players can't read data or receive realtime updates

CREATE POLICY "anon_select_sessions"   ON sessions       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sessions"   ON sessions       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_sessions"   ON sessions       FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_teams"      ON teams          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_teams"      ON teams          FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_teams"      ON teams          FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_decisions"  ON decisions      FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_decisions"  ON decisions      FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_decisions"  ON decisions      FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_results"    ON results        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_results"    ON results        FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_results"    ON results        FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_events"     ON market_events  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_events"     ON market_events  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_events"     ON market_events  FOR UPDATE TO anon USING (true) WITH CHECK (true);
