import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/planner/week?week=1
 *
 * Returns catalog meals for a given week (1–8) organized as:
 *   days: Array<{ day: number; meals: CatalogMeal[] }>
 * Plus the user's completion keys for that week.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const week = parseInt(searchParams.get('week') ?? '1', 10);

  if (isNaN(week) || week < 1 || week > 8) {
    return NextResponse.json({ error: 'week must be 1–8' }, { status: 400 });
  }

  const [mealsResult, completionsResult, configResult] = await Promise.all([
    supabase
      .from('meals')
      .select('id, day, meal_type, name, description, kcal, protein_g, carbs_g, fat_g, is_batch')
      .eq('week', week)
      .order('day')
      .order('meal_type'),
    supabase
      .from('catalog_completions')
      .select('day, meal_type')
      .eq('user_id', user.id)
      .eq('week', week),
    supabase
      .from('user_plan_config')
      .select('tdee_kcal, reference_tdee')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const meals = mealsResult.data ?? [];
  const completions = (completionsResult.data ?? []).map((c) => `${c.day}-${c.meal_type}`);

  const config = configResult.data ?? null;

  return NextResponse.json({ meals, completions, config });
}

/**
 * POST /api/planner/week
 * Body: { week: number; day: number; meal_type: string; completed: boolean }
 *
 * Toggle catalog meal completion.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { week, day, meal_type, completed } = body as {
    week: number;
    day: number;
    meal_type: string;
    completed: boolean;
  };

  if (!week || day === undefined || !meal_type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (completed) {
    await supabase
      .from('catalog_completions')
      .upsert(
        { user_id: user.id, week, day, meal_type },
        { onConflict: 'user_id,week,day,meal_type' }
      );
  } else {
    await supabase
      .from('catalog_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('week', week)
      .eq('day', day)
      .eq('meal_type', meal_type);
  }

  return NextResponse.json({ ok: true });
}
