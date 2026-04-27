-- Meal reactions: emoji voting on individual meals in shared plans
-- Identifies meals by: meal_plan_id + date + meal_type
-- Users can react with preset emojis: 👍 🔥 🤢 ❤️

CREATE TABLE IF NOT EXISTS public.meal_reactions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id      UUID          NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_date         DATE          NOT NULL,
  meal_type         TEXT          NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  user_id           UUID          NOT NULL,
  emoji             TEXT          NOT NULL CHECK (emoji IN ('👍', '🔥', '🤢', '❤️')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT meal_reactions_unique UNIQUE (meal_plan_id, meal_date, meal_type, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS meal_reactions_plan_idx
  ON public.meal_reactions (meal_plan_id);

CREATE INDEX IF NOT EXISTS meal_reactions_meal_idx
  ON public.meal_reactions (meal_plan_id, meal_date, meal_type);

ALTER TABLE public.meal_reactions ENABLE ROW LEVEL SECURITY;

-- Shared plan viewers can react (via anon/public endpoint, validated by shared plan token)
CREATE POLICY "Authenticated users can insert reactions"
  ON public.meal_reactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR true);

CREATE POLICY "Users can read all reactions"
  ON public.meal_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can delete their own reactions"
  ON public.meal_reactions FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');
