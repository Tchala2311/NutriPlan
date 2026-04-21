-- Add missing columns to health_assessments
-- Required by onboarding actions and insights engine

ALTER TABLE public.health_assessments
  ADD COLUMN IF NOT EXISTS avoided_ingredients   TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_goals        TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications_text       TEXT,
  ADD COLUMN IF NOT EXISTS eating_disorder_flag   BOOLEAN  NOT NULL DEFAULT FALSE;
