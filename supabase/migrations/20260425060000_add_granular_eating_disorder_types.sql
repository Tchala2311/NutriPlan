-- TES-154: Granular eating disorder flags (anorexia/restrictive vs BED vs orthorexia)
-- Replaces simple boolean eating_disorder_flag with specific disorder type indicators

ALTER TABLE health_assessments
  ADD COLUMN IF NOT EXISTS eating_disorder_anorexia_restrictive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eating_disorder_binge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eating_disorder_orthorexia boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN health_assessments.eating_disorder_anorexia_restrictive IS 'User has anorexia nervosa or restrictive eating patterns';
COMMENT ON COLUMN health_assessments.eating_disorder_binge IS 'User has binge eating disorder (BED)';
COMMENT ON COLUMN health_assessments.eating_disorder_orthorexia IS 'User has orthorexia (obsession with healthy eating)';
