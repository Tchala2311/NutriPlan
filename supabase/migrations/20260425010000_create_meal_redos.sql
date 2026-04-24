-- Create meal_redos table for tracking meal redo requests
-- Tracks redos per week with paywall after 3 free redos/week
CREATE TABLE meal_redos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  week_number INTEGER, -- Week identifier for catalog-based planning
  redo_type TEXT NOT NULL CHECK (redo_type IN ('individual', 'daily', 'weekly')),
  affected_date TEXT NOT NULL, -- The date being redone (for individual/daily) or week_start_date (for weekly)
  reason TEXT, -- User's explanation for why they're redoing
  paid BOOLEAN DEFAULT FALSE, -- Whether user paid for this redo (after 3/week limit)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(user_id, week_number, redo_type, affected_date, created_at)
);

-- Index for querying redos by user and week
CREATE INDEX meal_redos_user_week_idx ON meal_redos(user_id, week_number);

-- RLS policies
ALTER TABLE meal_redos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own redos"
  ON meal_redos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own redos"
  ON meal_redos FOR SELECT
  USING (auth.uid() = user_id);
