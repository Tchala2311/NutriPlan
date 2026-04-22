-- Add biometric columns to user_goals so TDEE can be computed server-side.
-- Per board requirement (TES-69): calories must be auto-calculated from user data
-- (weight, height, age, sex, activity_level). Fallback to stored targets when absent.

ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS weight_kg      NUMERIC(5,1) CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 500)),
  ADD COLUMN IF NOT EXISTS height_cm      INTEGER      CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 300)),
  ADD COLUMN IF NOT EXISTS age            INTEGER      CHECK (age IS NULL OR (age >= 10 AND age <= 120)),
  ADD COLUMN IF NOT EXISTS sex            TEXT         CHECK (sex IS NULL OR sex IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS activity_level TEXT         DEFAULT 'moderate'
    CHECK (activity_level IS NULL OR activity_level IN ('sedentary','light','moderate','active','very_active'));
