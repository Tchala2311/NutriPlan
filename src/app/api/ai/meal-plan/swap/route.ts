import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { swapMealSlot } from '@/lib/gigachat/client';
import type { UserProfile } from '@/lib/gigachat/client';

const MEAL_TYPE_RU: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snacks: 'Перекус',
};

const MEAL_KCAL_SHARE: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snacks: 0.1,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { plan_id, date, meal_type } = body as { plan_id: string; date: string; meal_type: string };
  if (!plan_id || !date || !meal_type) {
    return NextResponse.json({ error: 'Missing plan_id, date, or meal_type' }, { status: 400 });
  }

  // Fetch plan
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, slots')
    .eq('id', plan_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  // Collect existing meal titles for this day (to avoid repeats)
  const daySlots =
    (plan.slots as Record<string, Record<string, { recipe_id: string; pinned: boolean }>>)[date] ??
    {};
  const existingRecipeIds = Object.values(daySlots)
    .filter((s) => s.recipe_id && s.recipe_id !== daySlots[meal_type]?.recipe_id)
    .map((s) => s.recipe_id);

  let existingTitles: string[] = [];
  if (existingRecipeIds.length > 0) {
    const { data: existingRecipes } = await supabase
      .from('recipes')
      .select('title')
      .in('id', existingRecipeIds);
    existingTitles = (existingRecipes ?? []).map((r) => r.title);
  }

  // Load user profile
  const { data: ha } = await supabase
    .from('health_assessments')
    .select(
      'primary_goal, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, is_pregnant, pregnancy_trimester, is_breastfeeding'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: goals } = await supabase
    .from('user_goals')
    .select('daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g')
    .eq('user_id', user.id)
    .maybeSingle();

  const tdee = goals?.daily_calorie_target ?? 2000;
  const share = MEAL_KCAL_SHARE[meal_type] ?? 0.25;

  const userProfile: UserProfile = {
    primary_goal: ha?.primary_goal ?? 'general_wellness',
    dietary_restrictions: ha?.dietary_restrictions ?? [],
    allergens: ha?.allergens ?? [],
    medical_conditions: ha?.medical_conditions ?? [],
    // TES-150: Pregnancy/breastfeeding for safety restrictions
    is_pregnant: ha?.is_pregnant ?? false,
    pregnancy_trimester: (ha?.pregnancy_trimester ?? undefined) as 1 | 2 | 3 | undefined,
    is_breastfeeding: ha?.is_breastfeeding ?? false,
    tdee_kcal: tdee,
    target_protein_g: goals?.protein_target_g ?? 120,
    target_carbs_g: goals?.carbs_target_g ?? 200,
    target_fat_g: goals?.fat_target_g ?? 70,
  };

  // Generate new meal
  let newMeal;
  try {
    newMeal = await swapMealSlot(
      userProfile,
      meal_type,
      MEAL_TYPE_RU[meal_type] ?? meal_type,
      existingTitles,
      Math.round(tdee * share),
      Math.round((goals?.protein_target_g ?? 120) * share),
      Math.round((goals?.carbs_target_g ?? 200) * share),
      Math.round((goals?.fat_target_g ?? 70) * share)
    );
  } catch (err) {
    console.error('GigaChat swap error:', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  const admin = createAdminClient();
  const weightEstimate = meal_type === 'snacks' ? 150 : 300;
  function per100g(v: number) {
    return Math.round((v / weightEstimate) * 100 * 10) / 10;
  }

  const { data: inserted, error: insErr } = await admin
    .from('recipes')
    .insert({
      title: newMeal.title,
      ingredients: newMeal.ingredients,
      instructions: newMeal.steps,
      servings: 1,
      prep_time_min: newMeal.prep_min ?? null,
      calories_per_serving: newMeal.kcal ?? null,
      protein_per_serving: newMeal.p ?? null,
      carbs_per_serving: newMeal.c ?? null,
      fat_per_serving: newMeal.f ?? null,
      calories_per_100g: newMeal.kcal ? per100g(newMeal.kcal) : null,
      protein_per_100g: newMeal.p ? per100g(newMeal.p) : null,
      carbs_per_100g: newMeal.c ? per100g(newMeal.c) : null,
      fat_per_100g: newMeal.f ? per100g(newMeal.f) : null,
      dietary_tags: newMeal.tags ?? [],
      goal_tags: [],
      substitutions: newMeal.substitutions ?? [],
      source: 'gigachat',
      created_by_user_id: user.id,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
  }

  // Update plan slots
  const updatedSlots = { ...(plan.slots as Record<string, unknown>) };
  const updatedDay = { ...(daySlots as Record<string, unknown>) };
  updatedDay[meal_type] = { recipe_id: inserted.id, pinned: false };
  updatedSlots[date] = updatedDay;

  const { error: updateErr } = await admin
    .from('meal_plans')
    .update({ slots: updatedSlots })
    .eq('id', plan_id);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }

  const recipe = {
    id: inserted.id,
    title: newMeal.title,
    prep_time_min: newMeal.prep_min,
    calories_per_serving: newMeal.kcal,
    protein_per_serving: newMeal.p,
    carbs_per_serving: newMeal.c,
    fat_per_serving: newMeal.f,
    ingredients: newMeal.ingredients,
    instructions: newMeal.steps,
    dietary_tags: newMeal.tags ?? [],
    substitutions: newMeal.substitutions ?? [],
  };

  return NextResponse.json({ recipe, slot: { recipe_id: inserted.id, pinned: false } });
}
