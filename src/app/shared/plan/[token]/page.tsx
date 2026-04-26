import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

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
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snacks: 'Перекус',
};

const DAY_NAMES_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-bark-300 hover:bg-bark-400 text-cream-100 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Попробовать NutriPlan
          </Link>
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

  // Count total calories across all recipes in plan (rough estimate)
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
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-parchment-200 bg-cream-100/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥗</span>
            <span className="font-display text-base font-semibold text-bark-300">NutriPlan</span>
          </div>
          <Link
            href={`/register?ref=share`}
            className="text-xs font-semibold bg-bark-300 hover:bg-bark-400 text-cream-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Попробовать бесплатно →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Plan header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-1">
            Меню на неделю
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-bark-300">{dateRange}</h1>
          {avgDailyKcal > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              В среднем ~{avgDailyKcal} ккал/день · {allSlotRecipes.length} приёмов пищи
            </p>
          )}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDates.map((date, i) => {
            const daySlots = plan.slots?.[date] ?? {};
            const hasMeals = MEAL_TYPES.some((mt) => daySlots[mt]?.recipe_id);
            return (
              <div
                key={date}
                className="rounded-xl border border-parchment-200 bg-parchment-100 overflow-hidden"
              >
                {/* Day header */}
                <div className="px-3 py-2 border-b border-parchment-200 bg-parchment-50">
                  <p className="text-xs font-semibold text-bark-300">{DAY_NAMES_RU[i]}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>

                {/* Meals */}
                <div className="p-2 space-y-1.5">
                  {!hasMeals ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">Нет данных</p>
                  ) : (
                    MEAL_TYPES.map((mt) => {
                      const slot = daySlots[mt];
                      const recipe = slot?.recipe_id ? recipes[slot.recipe_id] : null;
                      if (!recipe) return null;
                      return (
                        <div
                          key={mt}
                          className="rounded-lg border border-parchment-200 bg-white px-2.5 py-2"
                        >
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                            {MEAL_LABEL[mt]}
                          </p>
                          <p className="text-xs font-semibold text-bark-300 leading-snug line-clamp-2">
                            {recipe.title}
                          </p>
                          {recipe.calories_per_serving && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {recipe.calories_per_serving} ккал
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Attribution footer */}
        <div className="mt-10 text-center rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
          <p className="text-sm font-medium text-bark-300 mb-1">
            Создан в NutriPlan — ИИ-планировщик питания
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Персональные меню, дневник питания, список покупок и ИИ-рекомендации
          </p>
          <Link
            href={`/register?ref=share`}
            className="inline-flex items-center gap-2 bg-bark-300 hover:bg-bark-400 text-cream-100 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Начать бесплатно →
          </Link>
        </div>
      </main>
    </div>
  );
}
