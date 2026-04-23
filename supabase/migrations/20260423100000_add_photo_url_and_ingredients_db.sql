-- Fix: add missing photo_url column to nutrition_logs
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ingredients reference database (nutrition per 100g)
CREATE TABLE IF NOT EXISTS ingredients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru     TEXT        NOT NULL,
  name_en     TEXT,
  category    TEXT        NOT NULL DEFAULT 'other',
  calories    NUMERIC(7,1) NOT NULL DEFAULT 0,
  protein_g   NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g     NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g       NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g     NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingredients_name_ru_prefix_idx ON ingredients (lower(name_ru) text_pattern_ops);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ingredients readable by all authenticated users"
  ON ingredients FOR SELECT TO authenticated USING (true);

-- Seed data is applied via the Supabase MCP migration (see TES-101 heartbeat 2026-04-23)
