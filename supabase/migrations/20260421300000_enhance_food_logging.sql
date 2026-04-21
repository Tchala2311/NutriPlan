-- TES-70: Enhance food logging — photo recognition, water tracking, AI suggestions

-- 5a: Add photo_url to nutrition_logs
ALTER TABLE nutrition_logs
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 5b: Water logs table
CREATE TABLE IF NOT EXISTS water_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml   INTEGER     NOT NULL CHECK (amount_ml > 0),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_logs_user_day_idx
  ON water_logs (user_id, logged_at);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own water logs"
  ON water_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5b: Add water_target_ml to user_goals
ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS water_target_ml INTEGER NOT NULL DEFAULT 2000
    CHECK (water_target_ml BETWEEN 500 AND 10000);
