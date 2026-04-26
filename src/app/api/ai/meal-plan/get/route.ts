import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const weekStart = getWeekStart(url.searchParams.get('week_start') ?? undefined);

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, week_start_date, slots')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStart)
    .maybeSingle();

  if (!plan) return NextResponse.json({ plan: null, recipes: {} });

  const slots = plan.slots as Record<
    string,
    Record<string, { recipe_id: string; pinned: boolean }>
  >;
  const recipeIds = new Set<string>();
  for (const daySlots of Object.values(slots)) {
    for (const slot of Object.values(daySlots)) {
      if (slot?.recipe_id) recipeIds.add(slot.recipe_id);
    }
  }

  if (recipeIds.size === 0) return NextResponse.json({ plan, recipes: {} });

  const { data: recipes } = await supabase
    .from('recipes')
    .select(
      'id, title, prep_time_min, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, ingredients, instructions, dietary_tags, substitutions'
    )
    .in('id', [...recipeIds]);

  return NextResponse.json({
    plan,
    recipes: Object.fromEntries((recipes ?? []).map((r) => [r.id, r])),
  });
}
