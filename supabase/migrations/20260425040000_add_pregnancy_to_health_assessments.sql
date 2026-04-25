-- TES-167: pregnancy & breastfeeding TDEE uplift + GigaChat food-safety restrictions
-- Adds three columns to health_assessments to track pregnancy status.

ALTER TABLE health_assessments
  ADD COLUMN IF NOT EXISTS is_pregnant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pregnancy_trimester smallint CHECK (pregnancy_trimester IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS is_breastfeeding boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN health_assessments.is_pregnant IS 'True if user is currently pregnant';
COMMENT ON COLUMN health_assessments.pregnancy_trimester IS 'Pregnancy trimester: 1, 2, or 3. NULL when not pregnant.';
COMMENT ON COLUMN health_assessments.is_breastfeeding IS 'True if user is currently breastfeeding';
