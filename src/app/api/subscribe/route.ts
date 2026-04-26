/**
 * POST /api/subscribe
 *
 * Initiates a YooKassa payment for the premium plan.
 * Returns { confirmationUrl } to redirect the user to YooKassa's hosted form.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPayment } from '@/lib/yookassa/client';
import { randomUUID } from 'crypto';

const PREMIUM_PRICE_RUB = '999.00';
const PREMIUM_LABEL = 'NutriPlan Premium — 1 месяц';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine return URL from origin
  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/dashboard/profile?payment=success`;

  try {
    const payment = await createPayment({
      amountValue: PREMIUM_PRICE_RUB,
      description: PREMIUM_LABEL,
      returnUrl,
      idempotencyKey: randomUUID(),
      savePaymentMethod: true,
      metadata: {
        user_id: user.id,
        plan: 'premium',
      },
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      throw new Error('No confirmation URL returned from YooKassa');
    }

    // Mark subscription as pending until webhook confirms
    await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan: 'premium',
        status: 'pending',
        yookassa_subscription_id: payment.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // Check if this user was referred and mark referral as completed
    // (reward granting happens in webhook or separate admin process)
    const { data: referral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (referral) {
      await supabase
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', referral.id);
    }

    return NextResponse.json({ confirmationUrl });
  } catch (err) {
    console.error('[subscribe] YooKassa error:', err);
    return NextResponse.json(
      { error: 'Payment initiation failed. Please try again.' },
      { status: 502 }
    );
  }
}
