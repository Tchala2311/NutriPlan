'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MealReactions } from '@/components/meal-reactions/MealReactions';

interface Reaction {
  meal_date: string;
  meal_type: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface MealSlot {
  recipe_id: string;
  pinned: boolean;
}

interface Recipe {
  id: string;
  title: string;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
}

interface SharedPlanClientProps {
  plan: {
    id: string;
    week_start_date: string;
    slots: Record<string, Record<string, MealSlot>>;
  };
  recipes: Record<string, Recipe>;
  token: string;
  dateRange: string;
  avgDailyKcal: number;
  allSlotCount: number;
}

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

// Generate anonymous user ID (persists in localStorage)
function getOrCreateAnonymousUserId(): string {
  const key = 'nutriplan_anonymous_user_id';
  let userId = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, userId);
    }
  }
  return userId;
}

export function SharedPlanClient({
  plan,
  recipes,
  token,
  dateRange,
  avgDailyKcal,
  allSlotCount,
}: SharedPlanClientProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(true);
  const [userId, setUserId] = useState('');
  const weekDates = getWeekDates(plan.week_start_date);

  useEffect(() => {
    const userId = getOrCreateAnonymousUserId();
    setUserId(userId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchReactions = async () => {
      try {
        const res = await fetch(`/api/meal-reactions/fetch?token=${token}&meal_plan_id=${plan.id}`);
        if (res.ok) {
          const data = await res.json();
          setReactions(data.data ?? []);
        }
      } catch (e) {
        console.error('Failed to fetch reactions:', e);
      } finally {
        setLoadingReactions(false);
      }
    };

    fetchReactions();
  }, [token, plan.id, userId]);

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
              В среднем ~{avgDailyKcal} ккал/день · {allSlotCount} приёмов пищи
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

                          {/* Reactions */}
                          {!loadingReactions && userId && (
                            <MealReactions
                              meal_plan_id={plan.id}
                              meal_date={date}
                              meal_type={mt}
                              shared_plan_token={token}
                              user_id={userId}
                              reactions={reactions}
                            />
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
