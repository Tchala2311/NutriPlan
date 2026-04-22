-- Allow users to customize their training days (TES-92)
-- training_days stores catalog day indices: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
-- Default: Mon/Wed/Fri/Sat (0,2,4,5) — same as previous hardcoded schedule
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS training_days INTEGER[] NOT NULL DEFAULT '{0,2,4,5}';
