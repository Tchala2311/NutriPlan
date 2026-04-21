-- Meal planner tables: recipes, meal_plans, saved_recipes

-- ── recipes ──────────────────────────────────────────────────────────────────
-- Stores AI-generated and user-imported recipe data.
-- Readable by all authenticated users; inserted via service role (API routes).
CREATE TABLE IF NOT EXISTS public.recipes (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT          NOT NULL,
  ingredients           JSONB         NOT NULL DEFAULT '[]',
  -- ingredients is an array of plain strings: "продукт количество"
  instructions          TEXT[]        NOT NULL DEFAULT '{}',
  servings              INTEGER       NOT NULL DEFAULT 1,
  prep_time_min         INTEGER,
  calories_per_serving  INTEGER,
  protein_per_serving   NUMERIC(6,1),
  carbs_per_serving     NUMERIC(6,1),
  fat_per_serving       NUMERIC(6,1),
  -- per-100g values for label display
  calories_per_100g     NUMERIC(6,1),
  protein_per_100g      NUMERIC(6,1),
  carbs_per_100g        NUMERIC(6,1),
  fat_per_100g          NUMERIC(6,1),
  image_url             TEXT,
  dietary_tags          TEXT[]        NOT NULL DEFAULT '{}',
  goal_tags             TEXT[]        NOT NULL DEFAULT '{}',
  -- substitutions: [{original, substitute, reason}]
  substitutions         JSONB         NOT NULL DEFAULT '[]',
  source                TEXT          NOT NULL DEFAULT 'gigachat',
  created_by_user_id    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read any recipe
CREATE POLICY "Authenticated users can read recipes"
  ON public.recipes FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── meal_plans ────────────────────────────────────────────────────────────────
-- One row per user per week. Slots JSONB structure:
-- {
--   "YYYY-MM-DD": {
--     "breakfast": {"recipe_id": "uuid", "pinned": false},
--     "lunch":     {"recipe_id": "uuid", "pinned": false},
--     "dinner":    {"recipe_id": "uuid", "pinned": false},
--     "snacks":    {"recipe_id": "uuid", "pinned": false}
--   }, ...
-- }
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date   DATE          NOT NULL,
  slots             JSONB         NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT meal_plans_user_week_key UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS meal_plans_user_week_idx
  ON public.meal_plans (user_id, week_start_date);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal plans"
  ON public.meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION handle_meal_plans_updated_at();

-- ── saved_recipes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   UUID          NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT saved_recipes_user_recipe_key UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS saved_recipes_user_idx
  ON public.saved_recipes (user_id);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved recipes"
  ON public.saved_recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
