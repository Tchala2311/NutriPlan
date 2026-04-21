-- User preferences / settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  units                TEXT        NOT NULL DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  language             TEXT        NOT NULL DEFAULT 'ru'     CHECK (language IN ('ru', 'en')),
  notification_prefs   JSONB       NOT NULL DEFAULT '{"meal_reminder_time": null, "water_reminder_interval_min": null, "ai_suggestion_timing": "off"}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION handle_user_settings_updated_at();
