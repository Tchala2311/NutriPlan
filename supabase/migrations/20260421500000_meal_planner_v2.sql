-- Meal planner v2: training schedule, store tags, meal completions

-- ── recipes: add stores column ────────────────────────────────────────────────
-- Stores which shops carry ingredients for this recipe.
-- Values: 'vkusvill' | 'perekrestok' | 'ozon' | 'rynok' | 'azbuka' | 'none'
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS stores TEXT[] NOT NULL DEFAULT '{}';

-- ── meal_plans: add training_schedule column ──────────────────────────────────
-- JSONB map of date → tag. e.g. {"2026-04-21": "зал", "2026-04-22": "отдых"}
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS training_schedule JSONB NOT NULL DEFAULT '{}';

-- ── meal_completions ──────────────────────────────────────────────────────────
-- Tracks which meal slots the user has checked off as eaten.
CREATE TABLE IF NOT EXISTS public.meal_completions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id    UUID          NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  slot_date       DATE          NOT NULL,
  meal_type       TEXT          NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  completed_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT meal_completions_unique UNIQUE (user_id, meal_plan_id, slot_date, meal_type)
);

CREATE INDEX IF NOT EXISTS meal_completions_plan_idx
  ON public.meal_completions (meal_plan_id);

CREATE INDEX IF NOT EXISTS meal_completions_user_idx
  ON public.meal_completions (user_id);

ALTER TABLE public.meal_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal completions"
  ON public.meal_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
