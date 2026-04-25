-- Add tone_mode column to user_settings (TES-163)
-- Controls verbosity of AI-generated insights: краткий = brief, подробный = detailed
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS tone_mode TEXT NOT NULL DEFAULT 'краткий'
    CHECK (tone_mode IN ('краткий', 'подробный'));

COMMENT ON COLUMN public.user_settings.tone_mode IS 'AI response verbosity: краткий (brief) or подробный (detailed)';
