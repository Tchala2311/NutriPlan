-- Subscription plans: 'free' | 'premium'
-- Status: 'active' | 'cancelled' | 'past_due' | 'pending'

create table if not exists subscriptions (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  plan                       text not null default 'free',
  status                     text not null default 'active',
  current_period_end         timestamptz,
  yookassa_subscription_id   text,
  yookassa_payment_method_id text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique(user_id),
  constraint subscriptions_plan_check   check (plan   in ('free', 'premium')),
  constraint subscriptions_status_check check (status in ('active', 'cancelled', 'past_due', 'pending'))
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

-- RLS
alter table subscriptions enable row level security;

-- Users can only read their own subscription
create policy "subscriptions_select_own"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Service role can do everything (used by webhook via server client)
create policy "subscriptions_service_all"
  on subscriptions for all
  using (auth.role() = 'service_role');

-- Index for fast user lookup
create index subscriptions_user_id_idx on subscriptions(user_id);
