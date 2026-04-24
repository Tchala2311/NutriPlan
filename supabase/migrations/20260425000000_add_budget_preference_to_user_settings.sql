-- Add budget_preference column to user_settings
ALTER TABLE public.user_settings
ADD COLUMN budget_preference TEXT DEFAULT 'moderate' CHECK (budget_preference IN ('low', 'moderate', 'high'));

-- Update documentation comment
COMMENT ON COLUMN public.user_settings.budget_preference IS 'Budget preference for meal planning: low, moderate, or high';
