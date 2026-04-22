-- Fix: expand primary_goal constraint to include all goal types
-- Previous constraint only allowed 3 goals, but form offers 5

ALTER TABLE public.user_goals
DROP CONSTRAINT IF EXISTS user_goals_primary_goal_check;

ALTER TABLE public.user_goals
ADD CONSTRAINT user_goals_primary_goal_check
CHECK (primary_goal IS NULL OR primary_goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'disease_management', 'general_wellness'));
