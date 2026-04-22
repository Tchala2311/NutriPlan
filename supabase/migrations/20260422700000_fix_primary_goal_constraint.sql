-- Fix primary_goal CHECK constraint to allow all 5 goal types
-- Form already supports: weight_loss, muscle_gain, maintenance, disease_management, general_wellness
-- But DB constraint only allowed: weight_loss, muscle_gain, maintenance

ALTER TABLE public.user_goals DROP CONSTRAINT IF EXISTS user_goals_primary_goal_check;

ALTER TABLE public.user_goals
  ADD CONSTRAINT user_goals_primary_goal_check
    CHECK (primary_goal IS NULL OR primary_goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'disease_management', 'general_wellness'));
