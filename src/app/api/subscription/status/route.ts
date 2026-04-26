/**
 * GET /api/subscription/status
 *
 * Returns the current user's subscription plan and status.
 * Used by client components after payment return.
 */

import { NextResponse } from 'next/server';
import { getUserSubscription } from '@/lib/subscription';

export async function GET() {
  const sub = await getUserSubscription();

  if (!sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    plan: sub.plan,
    status: sub.status,
    current_period_end: sub.current_period_end,
  });
}
