-- Nutrition log entries
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date  DATE        NOT NULL,
  meal_type    TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_name    TEXT        NOT NULL,
  calories     INTEGER     NOT NULL DEFAULT 0,
  protein_g    NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g      NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g        NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nutrition_logs_user_date_idx
  ON nutrition_logs (user_id, logged_date);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own nutrition logs"
  ON nutrition_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
