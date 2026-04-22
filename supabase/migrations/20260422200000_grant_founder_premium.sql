-- Grant permanent Pro (premium) access to the founder account.
-- is_founder=true prevents billing webhooks from overwriting this row.

insert into subscriptions (user_id, plan, status, current_period_end, is_founder)
select id, 'premium', 'active', null, true
from auth.users
where email = 'tsem7354@gmail.com'
on conflict (user_id) do update set
  plan               = 'premium',
  status             = 'active',
  current_period_end = null,
  is_founder         = true,
  updated_at         = now();
