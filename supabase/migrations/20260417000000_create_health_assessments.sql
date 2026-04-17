-- Health assessment questionnaire responses (Layer 1.1 onboarding profile)
CREATE TABLE IF NOT EXISTS public.health_assessments (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goals (Q6, Q7)
  health_goals                TEXT[]      NOT NULL DEFAULT '{}',
  primary_goal                TEXT        CHECK (primary_goal IN ('weight_loss','muscle_gain','maintenance','disease_management','general_wellness')),
  protein_target_g            INTEGER     CHECK (protein_target_g >= 20 AND protein_target_g <= 500),

  -- Food Preferences (Q8, Q9)
  dietary_restrictions        TEXT[]      NOT NULL DEFAULT '{}',
  dietary_restrictions_other  TEXT,
  allergens                   TEXT[]      NOT NULL DEFAULT '{}',
  allergens_other             TEXT,

  -- Health Background (Q10, Q11)
  medical_conditions          TEXT[]      NOT NULL DEFAULT '{}',
  medical_conditions_other    TEXT,
  medications                 TEXT,

  -- Derived feature flags
  glucose_tracking_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  protein_cap_g_per_kg        NUMERIC(4,2),
  eating_disorder_ui_mode     BOOLEAN     NOT NULL DEFAULT FALSE,
  sodium_tracking_enabled     BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Disclaimer
  disclaimer_accepted         BOOLEAN     NOT NULL DEFAULT FALSE,
  disclaimer_accepted_at      TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT health_assessments_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own health assessment"
  ON public.health_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_health_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_health_assessments_updated_at
  BEFORE UPDATE ON public.health_assessments
  FOR EACH ROW EXECUTE FUNCTION handle_health_assessments_updated_at();
