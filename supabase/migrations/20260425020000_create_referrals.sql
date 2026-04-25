-- Referral system: track referrers and rewards
-- Status: 'pending' (user signed up) | 'completed' (referred user subscribed) | 'rewarded' (reward claimed)

create table if not exists referrals (
  id                         uuid primary key default gen_random_uuid(),
  referrer_id                uuid not null references auth.users(id) on delete cascade,
  referred_user_id           uuid not null references auth.users(id) on delete cascade,
  status                     text not null default 'pending',
  reward_type                text not null default 'free_month', -- 'free_month', 'discount_code', etc
  created_at                 timestamptz not null default now(),
  completed_at               timestamptz,
  rewarded_at                timestamptz,
  unique(referred_user_id), -- each user can only be referred once
  constraint referrals_status_check check (status in ('pending', 'completed', 'rewarded'))
);

-- RLS
alter table referrals enable row level security;

-- Users can see referrals they made (as referrer)
create policy "referrals_select_own_referrals"
  on referrals for select
  using (auth.uid() = referrer_id);

-- Service role can do everything (used by API)
create policy "referrals_service_all"
  on referrals for all
  using (auth.role() = 'service_role');

-- Indexes
create index referrals_referrer_id_idx on referrals(referrer_id);
create index referrals_referred_user_id_idx on referrals(referred_user_id);
create index referrals_status_idx on referrals(status);
