-- Migration 012: Products table (product-centric decisions)

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'haut',
  style TEXT NOT NULL DEFAULT 'casual_luxe',
  supplier TEXT NOT NULL DEFAULT 'usine_europe',
  price_tier TEXT NOT NULL DEFAULT 'milieu',
  distribution TEXT NOT NULL DEFAULT 'ecommerce',
  comm_channel TEXT NOT NULL DEFAULT 'tiktok_insta',
  budget INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon USING (true);

NOTIFY pgrst, 'reload schema';
