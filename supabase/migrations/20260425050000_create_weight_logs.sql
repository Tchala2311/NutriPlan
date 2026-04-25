-- Weight tracking time-series table for plateau detection and progress monitoring
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date date NOT NULL,
  weight_kg numeric(5, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for efficient time-range queries and daily lookups
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, logged_date DESC);

-- RLS: Users can only read/write their own weight logs
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight_logs_user_access" ON weight_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
