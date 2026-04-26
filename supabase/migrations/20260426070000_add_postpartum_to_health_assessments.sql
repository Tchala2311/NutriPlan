-- TES-150: Add postpartum support for breastfeeding meal planning
ALTER TABLE health_assessments
ADD COLUMN is_postpartum BOOLEAN DEFAULT FALSE,
ADD COLUMN postpartum_weeks_since_birth INTEGER,
ADD CONSTRAINT postpartum_weeks_valid CHECK (postpartum_weeks_since_birth IS NULL OR postpartum_weeks_since_birth >= 0);

-- Update database.types.ts when complete
-- Add to Row:
--   is_postpartum: boolean;
--   postpartum_weeks_since_birth: number | null;
-- Add to Insert:
--   is_postpartum?: boolean;
--   postpartum_weeks_since_birth?: number | null;
-- Add to Update:
--   is_postpartum?: boolean;
--   postpartum_weeks_since_birth?: number | null;
