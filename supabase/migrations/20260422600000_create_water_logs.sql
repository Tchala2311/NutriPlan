-- Water intake log entries
CREATE TABLE IF NOT EXISTS water_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml   INTEGER     NOT NULL CHECK (amount_ml > 0),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_logs_user_logged_at_idx
  ON water_logs (user_id, logged_at);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own water logs"
  ON water_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
