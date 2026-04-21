-- Multi-phase meal planner schema migration
-- Adds phases/days tables, enriches existing meals/shopping_items,
-- and creates user-state tables (program_meal_checks, user_shopping_state).
-- Non-destructive: existing meals and shopping_items tables are preserved.

-- ── phases ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.phases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  order_index     INT         NOT NULL,
  duration_weeks  INT         NOT NULL,
  goal_type       TEXT        NOT NULL CHECK (goal_type IN ('cut','performance','maintenance','foundation')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read phases"
  ON public.phases FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO public.phases (name, order_index, duration_weeks, goal_type)
SELECT name, order_index, duration_weeks, goal_type
FROM (VALUES
  ('Фаза 1: Основа',     1, 4, 'foundation'),
  ('Фаза 2: Результат',  2, 4, 'cut')
) AS v(name, order_index, duration_weeks, goal_type)
WHERE NOT EXISTS (SELECT 1 FROM public.phases LIMIT 1);

-- ── days ──────────────────────────────────────────────────────────────────────
-- week_number: 1–4 within the phase. day_number: 0–6 (Mon–Sun).
CREATE TABLE IF NOT EXISTS public.days (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id          UUID        NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  week_number       INT         NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  day_number        INT         NOT NULL CHECK (day_number BETWEEN 0 AND 6),
  day_type          TEXT        NOT NULL DEFAULT 'training' CHECK (day_type IN ('training','rest')),
  calorie_target    INT,
  protein_target_g  NUMERIC(5,1),
  carbs_target_g    NUMERIC(5,1),
  fat_target_g      NUMERIC(5,1),
  CONSTRAINT days_phase_week_day_key UNIQUE (phase_id, week_number, day_number)
);

ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read days"
  ON public.days FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed 56 days (2 phases × 4 weeks × 7 days)
INSERT INTO public.days (phase_id, week_number, day_number, day_type)
SELECT p.id, w.week_number, d.day_number, 'training'
FROM public.phases p
CROSS JOIN (SELECT generate_series(1, 4) AS week_number) w
CROSS JOIN (SELECT generate_series(0, 6) AS day_number) d
ON CONFLICT (phase_id, week_number, day_number) DO NOTHING;

-- ── enrich meals ──────────────────────────────────────────────────────────────
-- Add day_id FK linking to the normalised days table.
-- is_flexible and prep_time_min match the target schema.
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS day_id      UUID REFERENCES public.days(id),
  ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prep_time_min INT;

-- Map existing flat (phase, week, day) → normalised day_id.
-- Phase 1 meals have week 1–4; phase 2 meals have week 5–8 → offset by 4.
UPDATE public.meals m
SET day_id = d.id
FROM public.days d
JOIN public.phases p ON d.phase_id = p.id
WHERE p.order_index = m.phase
  AND d.week_number = CASE WHEN m.phase = 1 THEN m.week ELSE m.week - 4 END
  AND d.day_number  = m.day
  AND m.day_id IS NULL;

-- ── enrich shopping_items ─────────────────────────────────────────────────────
-- Add phase_id FK plus optional store/url columns.
ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.phases(id),
  ADD COLUMN IF NOT EXISTS store    TEXT,
  ADD COLUMN IF NOT EXISTS url      TEXT;

UPDATE public.shopping_items si
SET phase_id = p.id
FROM public.phases p
WHERE p.order_index = si.phase
  AND si.phase_id IS NULL;

-- ── program_meal_checks (user state) ─────────────────────────────────────────
-- Tracks which meal slots the user has checked off for each program day.
-- checks JSONB: { "breakfast": true, "lunch": false, "snack": false, "dinner": true }
CREATE TABLE IF NOT EXISTS public.program_meal_checks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id      UUID        NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  checks      JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_meal_checks_user_day_key UNIQUE (user_id, day_id)
);

CREATE INDEX IF NOT EXISTS program_meal_checks_user_idx
  ON public.program_meal_checks (user_id);

ALTER TABLE public.program_meal_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own program meal checks"
  ON public.program_meal_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── user_shopping_state (user state) ─────────────────────────────────────────
-- Persists per-user shopping state for a given week + window (A/B).
-- shop_assignments: { itemId: "vkusvill" | "perekrestok" | … }
-- links:            { itemId: "https://…" }
-- shop_checks:      { itemId: true }
-- people:           number of people (scales quantity display)
CREATE TABLE IF NOT EXISTS public.user_shopping_state (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week              INT         NOT NULL CHECK (week BETWEEN 1 AND 8),
  shopping_window   CHAR(1)     NOT NULL CHECK (shopping_window IN ('A','B')),
  shop_assignments  JSONB       NOT NULL DEFAULT '{}',
  links             JSONB       NOT NULL DEFAULT '{}',
  shop_checks       JSONB       NOT NULL DEFAULT '{}',
  people            INT         NOT NULL DEFAULT 1 CHECK (people >= 1),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_shopping_state_user_week_window_key UNIQUE (user_id, week, shopping_window)
);

CREATE INDEX IF NOT EXISTS user_shopping_state_user_idx
  ON public.user_shopping_state (user_id);

ALTER TABLE public.user_shopping_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own shopping state"
  ON public.user_shopping_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
