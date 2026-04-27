-- Add username field to user_settings for @mention tagging system
-- TES-188: Username/tagging system for user profiles + friend search

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD CONSTRAINT user_settings_username_key UNIQUE (username);

-- Create partial unique index to allow multiple NULLs (users who haven't set username yet)
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_username_not_null_idx
  ON public.user_settings (username)
  WHERE username IS NOT NULL;

-- Update updated_at trigger to handle username changes
-- (trigger already exists from previous migration)
