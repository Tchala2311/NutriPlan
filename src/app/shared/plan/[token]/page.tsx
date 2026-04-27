import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { SharedPlanClient } from './client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

type MealSlot = { recipe_id: string; pinned: boolean };
type MealPlanRow = {
  id: string;
  week_start_date: string;
  slots: Record<string, Record<string, MealSlot>>;
};

type RecipeRow = {
  id: string;
  title: string;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  prep_time_min: number | null;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: shared } = await supabase
    .from('shared_plans')
    .select('meal_plan_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!shared || new Date((shared as { expires_at: string }).expires_at) < new Date()) {
    return { title: 'Ссылка недействительна — NutriPlan' };
  }

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('week_start_date, slots')
    .eq('id', (shared as { meal_plan_id: string }).meal_plan_id)
    .maybeSingle();

  if (!plan) return { title: 'План питания — NutriPlan' };

  const p = plan as MealPlanRow;
  const recipeIds = Object.values(p.slots ?? {}).flatMap((day) =>
    Object.values(day ?? {}).map((s) => s.recipe_id)
  );
  const totalSlots = recipeIds.length;
  const from = new Date(p.week_start_date + 'T00:00:00');
  const dateStr = from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return {
    title: `Меню на неделю с ${dateStr} — NutriPlan`,
    description: `Персональный план питания: ${totalSlots} приёмов пищи на неделю. Создан в NutriPlan.`,
    openGraph: {
      title: `Меню на неделю с ${dateStr}`,
      description: `${totalSlots} приёмов пищи · Создан в NutriPlan`,
      siteName: 'NutriPlan',
    },
  };
}

export default async function SharedPlanPage({ params }: Props) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: shared } = await supabase
    .from('shared_plans')
    .select('meal_plan_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!shared) notFound();

  const s = shared as { meal_plan_id: string; expires_at: string };

  if (new Date(s.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="font-display text-xl font-bold text-bark-300 mb-2">Ссылка устарела</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Срок действия этой ссылки истёк. Попросите автора поделиться снова.
          </p>
        </div>
      </div>
    );
  }

  const { data: planRaw } = await supabase
    .from('meal_plans')
    .select('id, week_start_date, slots')
    .eq('id', s.meal_plan_id)
    .maybeSingle();

  if (!planRaw) notFound();

  const plan = planRaw as MealPlanRow;
  const weekDates = getWeekDates(plan.week_start_date);

  // Collect recipe IDs
  const recipeIds = Array.from(
    new Set(
      weekDates.flatMap(
        (date) =>
          MEAL_TYPES.map((mt) => plan.slots?.[date]?.[mt]?.recipe_id).filter(Boolean) as string[]
      )
    )
  );

  const { data: recipesRaw } = await supabase
    .from('recipes')
    .select(
      'id, title, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, prep_time_min'
    )
    .in('id', recipeIds.length > 0 ? recipeIds : ['00000000-0000-0000-0000-000000000000']);

  const recipes: Record<string, RecipeRow> = {};
  for (const r of (recipesRaw ?? []) as RecipeRow[]) {
    recipes[r.id] = r;
  }

  const fromDate = new Date(plan.week_start_date + 'T00:00:00');
  const toDate = new Date(weekDates[6] + 'T00:00:00');
  const dateRange = `${fromDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} – ${toDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;

  // Count total calories
  const allSlotRecipes = weekDates.flatMap(
    (date) =>
      MEAL_TYPES.map((mt) => plan.slots?.[date]?.[mt]?.recipe_id).filter(Boolean) as string[]
  );
  const totalKcal = allSlotRecipes.reduce(
    (sum, rid) => sum + (recipes[rid]?.calories_per_serving ?? 0),
    0
  );
  const avgDailyKcal = allSlotRecipes.length > 0 ? Math.round(totalKcal / 7) : 0;

  return (
    <SharedPlanClient
      plan={plan}
      recipes={recipes}
      token={token}
      dateRange={dateRange}
      avgDailyKcal={avgDailyKcal}
      allSlotCount={allSlotRecipes.length}
    />
  );
}
