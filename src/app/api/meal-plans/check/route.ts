import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/meal-plans/check
 * Body: { dayId: string, checks: Record<string, boolean> }
 * Upserts the user's meal check state for a given program day.
 * checks example: { "breakfast": true, "lunch": false, "snack": true, "dinner": false }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { dayId?: string; checks?: Record<string, boolean> };

  if (!body.dayId || typeof body.dayId !== 'string') {
    return NextResponse.json({ error: 'dayId is required' }, { status: 400 });
  }
  if (!body.checks || typeof body.checks !== 'object' || Array.isArray(body.checks)) {
    return NextResponse.json({ error: 'checks must be an object' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('program_meal_checks')
    .upsert(
      {
        user_id: user.id,
        day_id: body.dayId,
        checks: body.checks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,day_id' }
    )
    .select('id, day_id, checks, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** GET /api/meal-plans/check?dayId=... — fetch check state for a day */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dayId = req.nextUrl.searchParams.get('dayId');
  if (!dayId) return NextResponse.json({ error: 'dayId is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('program_meal_checks')
    .select('id, day_id, checks, updated_at')
    .eq('user_id', user.id)
    .eq('day_id', dayId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { day_id: dayId, checks: {} });
}
