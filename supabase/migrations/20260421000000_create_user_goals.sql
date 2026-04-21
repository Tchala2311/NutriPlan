-- User nutrition goals (calorie target + macro split + primary goal)
CREATE TABLE IF NOT EXISTS public.user_goals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal          TEXT        CHECK (primary_goal IN ('weight_loss', 'muscle_gain', 'maintenance')),
  daily_calorie_target  INTEGER     NOT NULL DEFAULT 2000 CHECK (daily_calorie_target BETWEEN 500 AND 10000),
  protein_target_g      INTEGER     NOT NULL DEFAULT 150  CHECK (protein_target_g BETWEEN 10 AND 500),
  carbs_target_g        INTEGER     NOT NULL DEFAULT 200  CHECK (carbs_target_g BETWEEN 10 AND 1000),
  fat_target_g          INTEGER     NOT NULL DEFAULT 65   CHECK (fat_target_g BETWEEN 5 AND 500),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_goals_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON public.user_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION handle_user_goals_updated_at();
