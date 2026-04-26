/**
 * POST /api/share/meal-plan
 *
 * Generates a read-only share link for the authenticated user's current week meal plan.
 * Returns { shareToken, shareUrl }.
 * The link is valid for 30 days (managed via shared_plans.expires_at).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

function generateToken(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let mealPlanId: string | null = null;

  try {
    const body = (await req.json()) as { mealPlanId?: string };
    mealPlanId = body.mealPlanId ?? null;
  } catch {
    // body is optional
  }

  // If no plan ID supplied, find the current week's plan
  if (!mealPlanId) {
    const today = new Date().toISOString().split('T')[0];
    const monday = (() => {
      const d = new Date(today + 'T00:00:00');
      const day = d.getDay();
      d.setDate(d.getDate() - ((day + 6) % 7));
      return d.toISOString().split('T')[0];
    })();

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start_date', monday)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: 'No meal plan found for this week' }, { status: 404 });
    }
    mealPlanId = plan.id as string;
  }

  // Reuse existing share token if one exists and hasn't expired
  const { data: existing } = await supabase
    .from('shared_plans')
    .select('token, expires_at')
    .eq('meal_plan_id', mealPlanId)
    .eq('user_id', user.id)
    .maybeSingle();

  let token: string;

  if (existing && new Date((existing as { expires_at: string }).expires_at) > new Date()) {
    token = (existing as { token: string }).token;
  } else {
    // Delete stale record if any
    if (existing) {
      await supabase
        .from('shared_plans')
        .delete()
        .eq('meal_plan_id', mealPlanId)
        .eq('user_id', user.id);
    }

    token = generateToken();
    const { error } = await supabase.from('shared_plans').insert({
      token,
      meal_plan_id: mealPlanId,
      user_id: user.id,
    });

    if (error) {
      console.error('[share/meal-plan] insert error:', error);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }
  }

  const origin = new URL(req.url).origin;
  const shareUrl = `${origin}/shared/plan/${token}`;

  return NextResponse.json({ shareToken: token, shareUrl });
}
