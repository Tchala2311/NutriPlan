-- Multi-phase meal planner: user config + catalog completion tracking
-- TES-69 / TES-81 architecture

-- ── user_plan_config ──────────────────────────────────────────────────────────
-- Per-user TDEE override for calorie scaling.
-- Plan calories are templates; render = template × (user_tdee / reference_tdee).
CREATE TABLE IF NOT EXISTS public.user_plan_config (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tdee_kcal                 INTEGER       NOT NULL DEFAULT 2200,
  reference_tdee            INTEGER       NOT NULL DEFAULT 2200,
  macro_preference_override JSONB         DEFAULT NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT user_plan_config_unique UNIQUE (user_id)
);

ALTER TABLE public.user_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own plan config"
  ON public.user_plan_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_user_plan_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_plan_config_updated_at
  BEFORE UPDATE ON public.user_plan_config
  FOR EACH ROW EXECUTE FUNCTION handle_user_plan_config_updated_at();

-- ── catalog_completions ───────────────────────────────────────────────────────
-- Tracks which catalog meals a user has marked as eaten.
-- References the static meals table by (week, day, meal_type).
CREATE TABLE IF NOT EXISTS public.catalog_completions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week          INTEGER       NOT NULL CHECK (week BETWEEN 1 AND 8),
  day           INTEGER       NOT NULL CHECK (day BETWEEN 0 AND 6),
  meal_type     TEXT          NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
  completed_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT catalog_completions_unique UNIQUE (user_id, week, day, meal_type)
);

CREATE INDEX IF NOT EXISTS catalog_completions_user_week_idx
  ON public.catalog_completions (user_id, week);

ALTER TABLE public.catalog_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own catalog completions"
  ON public.catalog_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
