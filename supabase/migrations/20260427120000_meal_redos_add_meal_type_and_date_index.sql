-- Add affected_meal_type column to store which meal was redone (for user portrait)
ALTER TABLE meal_redos ADD COLUMN IF NOT EXISTS affected_meal_type TEXT;

-- Add index for calendar-week redo counting by date range
CREATE INDEX IF NOT EXISTS meal_redos_user_date_idx ON meal_redos(user_id, affected_date);
