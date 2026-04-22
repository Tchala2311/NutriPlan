-- TES-103: Add plan_start_date to user_plan_config
-- Used to anchor catalog-planner users to a calendar date so recipes page
-- can compute which catalog week the user is currently on.
ALTER TABLE public.user_plan_config ADD COLUMN IF NOT EXISTS plan_start_date date;
