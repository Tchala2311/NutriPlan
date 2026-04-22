"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import {
  Dumbbell, Moon, CheckCircle2, Circle, Loader2,
  ShoppingCart, LayoutGrid, List, Package, ChevronRight,
  Target, Flame,
} from "lucide-react";
import {
  PHASES, MEAL_TYPES, MEAL_LABEL_RU, DAY_NAMES_RU,
  isCatalogTrainingDay, toGlobalWeek,
  type MealType, type Phase,
} from "@/lib/planner/phases";
import {
  getPhaseGuidance,
  getPhaseCalorieTarget,
} from "@/lib/planner/goal-prompts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CatalogMeal {
  id: string;
  day: number;
  meal_type: string;
  name: string;
  description: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  is_batch: boolean;
}

export interface ShoppingItem {
  category: string;
  category_order: number;
  item_name: string;
  quantity_per_person: string | null;
  shopping_window: "A" | "B";
}

export interface UserPlanConfig {
  tdee_kcal: number;
  reference_tdee: number;
}

export interface UserGoalContext {
  primaryGoal: string;
  secondaryGoals: string[];
  dietaryRestrictions: string[];
  allergens: string[];
  avoidedIngredients: string[];
  medicalConditions: string[];
  eatingDisorderFlag: boolean;
}

interface MultiPhasePlannerClientProps {
  initialMeals: CatalogMeal[];
  initialCompletions: string[];  // "day-meal_type" keys
  initialConfig: UserPlanConfig | null;
  initialShopping: ShoppingItem[];
  goalContext?: UserGoalContext;
  trainingDays?: number[]; // catalog indices 0=Mon…6=Sun; falls back to DEFAULT_TRAINING_DAYS
}

type ViewMode = "schedule" | "list" | "shopping";

// ── Meal colors by type ──────────────────────────────────────────────────────

const MEAL_COLOR: Record<string, string> = {
  breakfast: "bg-amber-50 border-amber-100",
  lunch:     "bg-sage-50 border-sage-100",
  snack:     "bg-parchment-100 border-parchment-200",
  dinner:    "bg-vital-50 border-vital-100",
};

const MEAL_ACCENT: Record<string, string> = {
  breakfast: "text-amber-500",
  lunch:     "text-sage-500",
  snack:     "text-stone-400",
  dinner:    "text-vital-500",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaleKcal(
  templateKcal: number,
  config: UserPlanConfig | null
): number {
  if (!config || config.tdee_kcal === config.reference_tdee) return templateKcal;
  const scaled = Math.round(templateKcal * (config.tdee_kcal / config.reference_tdee));
  return Math.max(scaled, 1600);
}

function completionKey(day: number, meal_type: string): string {
  return `${day}-${meal_type}`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function MultiPhasePlannerClient({
  initialMeals,
  initialCompletions,
  initialConfig,
  initialShopping,
  goalContext,
  trainingDays,
}: MultiPhasePlannerClientProps) {
  const trainingDaysSet = useMemo(
    () => trainingDays ? new Set(trainingDays) : undefined,
    [trainingDays]
  );
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(1);
  const [activeWeekInPhase, setActiveWeekInPhase] = useState<1 | 2>(1);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");

  // Cache: globalWeek → { meals, completions }
  const [mealsCache, setMealsCache] = useState<Record<number, CatalogMeal[]>>({
    1: initialMeals,
  });
  const [completionsCache, setCompletionsCache] = useState<Record<number, Set<string>>>({
    1: new Set(initialCompletions),
  });
  const [shoppingCache, setShoppingCache] = useState<Record<number, ShoppingItem[]>>({
    1: initialShopping,
  });

  const [loadingWeek, setLoadingWeek] = useState(false);
  const [, startTransition] = useTransition();

  const globalWeek = toGlobalWeek(activePhase, activeWeekInPhase);
  const phase = PHASES[activePhase - 1];
  const meals = mealsCache[globalWeek] ?? [];
  const completions = completionsCache[globalWeek] ?? new Set<string>();
  const shopping = shoppingCache[globalWeek] ?? [];

  // Batch meal names this week — recipe appears as batch in meals
  const batchMealNames = useMemo(() => {
    return new Set(meals.filter((m) => m.is_batch).map((m) => m.name));
  }, [meals]);

  // Day totals for calorie progress
  const dayTotals = useMemo(() => {
    const totals: Record<number, { kcal: number; protein_g: number; carbs_g: number; fat_g: number }> = {};
    for (const meal of meals) {
      if (!totals[meal.day]) totals[meal.day] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      totals[meal.day].kcal += meal.kcal ?? 0;
      totals[meal.day].protein_g += meal.protein_g ?? 0;
      totals[meal.day].carbs_g += meal.carbs_g ?? 0;
      totals[meal.day].fat_g += meal.fat_g ?? 0;
    }
    return totals;
  }, [meals]);

  // Load a week if not cached
  async function ensureWeek(gw: number) {
    if (mealsCache[gw] !== undefined) return;
    setLoadingWeek(true);
    try {
      const [mealsRes, shoppingRes] = await Promise.all([
        fetch(`/api/planner/week?week=${gw}`),
        fetch(`/api/planner/shopping?week=${gw}`),
      ]);
      if (mealsRes.ok) {
        const data = await mealsRes.json();
        setMealsCache((prev) => ({ ...prev, [gw]: data.meals ?? [] }));
        setCompletionsCache((prev) => ({
          ...prev,
          [gw]: new Set<string>(data.completions ?? []),
        }));
      } else {
        setMealsCache((prev) => ({ ...prev, [gw]: [] }));
        setCompletionsCache((prev) => ({ ...prev, [gw]: new Set() }));
      }
      if (shoppingRes.ok) {
        const data = await shoppingRes.json();
        setShoppingCache((prev) => ({ ...prev, [gw]: data.items ?? [] }));
      } else {
        setShoppingCache((prev) => ({ ...prev, [gw]: [] }));
      }
    } finally {
      setLoadingWeek(false);
    }
  }

  async function switchPhase(p: 1 | 2 | 3 | 4) {
    setActivePhase(p);
    setActiveWeekInPhase(1);
    const gw = toGlobalWeek(p, 1);
    await ensureWeek(gw);
  }

  async function switchWeek(w: 1 | 2) {
    setActiveWeekInPhase(w);
    const gw = toGlobalWeek(activePhase, w);
    await ensureWeek(gw);
  }

  const toggleCompletion = useCallback(
    (day: number, meal_type: string) => {
      const key = completionKey(day, meal_type);
      const gw = toGlobalWeek(activePhase, activeWeekInPhase);
      const isNowCompleted = !completionsCache[gw]?.has(key);

      // Optimistic update
      setCompletionsCache((prev) => {
        const set = new Set(prev[gw] ?? []);
        if (isNowCompleted) set.add(key); else set.delete(key);
        return { ...prev, [gw]: set };
      });

      // Server sync (fire-and-forget)
      startTransition(() => {
        fetch("/api/planner/week", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: gw, day, meal_type, completed: isNowCompleted }),
        }).catch(() => {
          // Revert
          setCompletionsCache((prev) => {
            const set = new Set(prev[gw] ?? []);
            if (isNowCompleted) set.delete(key); else set.add(key);
            return { ...prev, [gw]: set };
          });
        });
      });
    },
    [activePhase, activeWeekInPhase, completionsCache]
  );

  // Count completions this week
  const completionCount = completions.size;
  const totalMeals = meals.length;

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-bark-300">
          Планировщик питания
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          8-недельная программа · 4 фазы · Российский рынок
        </p>
      </div>

      {/* Phase tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1 overflow-x-auto">
          {PHASES.map((ph) => (
            <button
              key={ph.number}
              onClick={() => switchPhase(ph.number as 1 | 2 | 3 | 4)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activePhase === ph.number
                  ? "bg-white shadow-warm-sm text-bark-300"
                  : "text-stone-400 hover:text-bark-300"
              }`}
            >
              <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${
                activePhase === ph.number ? "bg-bark-300 text-white" : "bg-parchment-200 text-stone-500"
              }`}>
                Ф{ph.number}
              </span>
              <span className="hidden sm:inline">{ph.nameRu}</span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1 ml-auto">
          <button
            onClick={() => setViewMode("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "schedule" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">График</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "list" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Список</span>
          </button>
          <button
            onClick={() => setViewMode("shopping")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "shopping" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Покупки</span>
          </button>
        </div>
      </div>

      {/* Phase info banner */}
      <PhaseBanner phase={phase} config={initialConfig} goalContext={goalContext} />

      {/* Week sub-tabs */}
      <div className="flex items-center gap-2 mb-5">
        {([1, 2] as const).map((w) => (
          <button
            key={w}
            onClick={() => switchWeek(w)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              activeWeekInPhase === w
                ? "bg-white border-parchment-300 shadow-warm-sm text-bark-300"
                : "border-transparent text-stone-400 hover:text-bark-300 hover:border-parchment-200"
            }`}
          >
            Неделя {w}
            <span className="ml-1.5 text-2xs text-stone-400">
              (нед. {toGlobalWeek(activePhase, w)})
            </span>
          </button>
        ))}

        {/* Progress pill */}
        {totalMeals > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-stone-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-sage-400" />
            {completionCount}/{totalMeals}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loadingWeek ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sage-300" />
        </div>
      ) : viewMode === "schedule" ? (
        <ScheduleView
          meals={meals}
          completions={completions}
          batchMealNames={batchMealNames}
          dayTotals={dayTotals}
          phase={phase}
          config={initialConfig}
          goalContext={goalContext}
          trainingDaysSet={trainingDaysSet}
          onToggleCompletion={toggleCompletion}
        />
      ) : viewMode === "list" ? (
        <ListView
          meals={meals}
          completions={completions}
          batchMealNames={batchMealNames}
          trainingDaysSet={trainingDaysSet}
          onToggleCompletion={toggleCompletion}
        />
      ) : (
        <ShoppingView
          items={shopping}
          globalWeek={globalWeek}
        />
      )}
    </div>
  );
}

// ── Phase Banner ─────────────────────────────────────────────────────────────

function PhaseBanner({
  phase,
  config,
  goalContext,
}: {
  phase: Phase;
  config: UserPlanConfig | null;
  goalContext?: UserGoalContext;
}) {
  const goal = goalContext?.primaryGoal ?? "general_wellness";
  const edFlag = goalContext?.eatingDisorderFlag ?? false;

  // Use goal-specific calorie targets, then scale by user TDEE
  const goalCalorieTarget = getPhaseCalorieTarget(goal, phase.number);
  const trainingKcal = scaleKcal(goalCalorieTarget.training, config);
  const restKcal = scaleKcal(goalCalorieTarget.rest, config);

  const guidance = getPhaseGuidance(goal, phase.number, edFlag);

  return (
    <div className="mb-5 rounded-2xl bg-gradient-to-r from-parchment-100 to-parchment-50 border border-parchment-200 p-4">
      <div className="flex flex-col gap-3">
        {/* Guidance text */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-bark-200" />
            <span className="text-xs font-semibold text-bark-200 uppercase tracking-wide">
              Цель фазы
            </span>
          </div>
          <p className="text-sm text-bark-300">{guidance}</p>
        </div>

        {/* Calorie targets — hidden when ED flag active */}
        {!edFlag && (
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Training day target */}
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-0.5">
                <Dumbbell className="h-3 w-3 text-vital-500" />
                <span className="text-2xs text-stone-400 font-medium">Зал</span>
              </div>
              <p className="text-lg font-bold text-bark-300">{trainingKcal.toLocaleString("ru")}</p>
              <p className="text-2xs text-stone-400">ккал</p>
              <p className="text-2xs text-stone-400 mt-0.5">
                Б{phase.macros.training.protein_g} У{phase.macros.training.carbs_g} Ж{phase.macros.training.fat_g}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-parchment-300 hidden sm:block" />

            {/* Rest day target */}
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-0.5">
                <Moon className="h-3 w-3 text-stone-400" />
                <span className="text-2xs text-stone-400 font-medium">Отдых</span>
              </div>
              <p className="text-lg font-bold text-bark-300">{restKcal.toLocaleString("ru")}</p>
              <p className="text-2xs text-stone-400">ккал</p>
              <p className="text-2xs text-stone-400 mt-0.5">
                Б{phase.macros.rest.protein_g} У{phase.macros.rest.carbs_g} Ж{phase.macros.rest.fat_g}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Schedule View ─────────────────────────────────────────────────────────────

interface ScheduleViewProps {
  meals: CatalogMeal[];
  completions: Set<string>;
  batchMealNames: Set<string>;
  dayTotals: Record<number, { kcal: number; protein_g: number; carbs_g: number; fat_g: number }>;
  phase: Phase;
  config: UserPlanConfig | null;
  goalContext?: UserGoalContext;
  trainingDaysSet?: Set<number>;
  onToggleCompletion: (day: number, meal_type: string) => void;
}

function ScheduleView({ meals, completions, batchMealNames, dayTotals, phase, config, goalContext, trainingDaysSet, onToggleCompletion }: ScheduleViewProps) {
  // Group by day
  const byDay = useMemo(() => {
    const map: Record<number, Record<string, CatalogMeal>> = {};
    for (const meal of meals) {
      if (!map[meal.day]) map[meal.day] = {};
      map[meal.day][meal.meal_type] = meal;
    }
    return map;
  }, [meals]);

  const days = Array.from({ length: 7 }, (_, i) => i); // 0–6

  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {days.map((day) => {
              const isTraining = isCatalogTrainingDay(day, trainingDaysSet);
              return (
                <div key={day} className="text-center">
                  <div className="py-1.5 rounded-lg text-stone-400">
                    <p className="text-2xs font-semibold uppercase tracking-wide">{DAY_NAMES_RU[day]}</p>
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-2xs font-medium ${
                    isTraining ? "bg-vital-50 text-vital-500" : "bg-parchment-100 text-stone-400"
                  }`}>
                    {isTraining
                      ? <Dumbbell className="h-2.5 w-2.5" />
                      : <Moon className="h-2.5 w-2.5" />}
                    <span className="hidden sm:inline">{isTraining ? "Зал" : "Отдых"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meal type rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="mb-3">
              <p className={`text-2xs font-semibold uppercase tracking-wide mb-1.5 pl-1 ${MEAL_ACCENT[mealType]}`}>
                {MEAL_LABEL_RU[mealType]}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const meal = byDay[day]?.[mealType];
                  if (!meal) {
                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-dashed border-parchment-200 bg-parchment-50 h-28 flex items-center justify-center"
                      >
                        <span className="text-2xs text-stone-300">—</span>
                      </div>
                    );
                  }

                  const key = completionKey(day, mealType);
                  const isDone = completions.has(key);
                  const isBatch = batchMealNames.has(meal.name);

                  return (
                    <MealCard
                      key={day}
                      meal={meal}
                      isDone={isDone}
                      isBatch={isBatch}
                      mealType={mealType}
                      onToggle={() => onToggleCompletion(day, mealType)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day totals with calorie progress */}
      <div className="mt-4 overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Итого за день</p>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const totals = dayTotals[day] ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
              const isTraining = isCatalogTrainingDay(day, trainingDaysSet);
              const goalCalTarget = getPhaseCalorieTarget(
                goalContext?.primaryGoal ?? "general_wellness",
                phase.number
              );
              const target = scaleKcal(
                isTraining ? goalCalTarget.training : goalCalTarget.rest,
                config
              );
              const pct = target > 0 ? Math.min(Math.round((totals.kcal / target) * 100), 100) : 0;
              const inRange = pct >= 90 && pct <= 110;

              const edFlag = goalContext?.eatingDisorderFlag ?? false;

              return (
                <div key={day} className="rounded-xl bg-parchment-100 p-2 text-center">
                  {!edFlag && (
                    <>
                      <p className={`text-sm font-semibold ${inRange ? "text-sage-500" : "text-bark-300"}`}>
                        {Math.round(totals.kcal)}
                      </p>
                      <p className="text-2xs text-stone-400">/ {target.toLocaleString("ru")}</p>
                      {/* Progress bar */}
                      <div className="mt-1 h-1 bg-parchment-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${inRange ? "bg-sage-400" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  )}
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-2xs text-stone-400">Б {Math.round(totals.protein_g)}г</p>
                    <p className="text-2xs text-stone-400">У {Math.round(totals.carbs_g)}г</p>
                    <p className="text-2xs text-stone-400">Ж {Math.round(totals.fat_g)}г</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-2xs text-stone-400">
        <div className="flex items-center gap-1.5"><Dumbbell className="h-3 w-3 text-vital-400" /> День зала</div>
        <div className="flex items-center gap-1.5"><Moon className="h-3 w-3 text-stone-300" /> День отдыха</div>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-sage-400" /> Съедено</div>
        <div className="flex items-center gap-1.5"><Package className="h-3 w-3 text-amber-400" /> Можно готовить партией</div>
        <div className="flex items-center gap-1.5">
          <Flame className="h-3 w-3 text-sage-400" /> Зелёная полоска = цель ±10%
        </div>
      </div>
    </>
  );
}

// ── Meal Card ─────────────────────────────────────────────────────────────────

function MealCard({
  meal, isDone, isBatch, mealType, onToggle,
}: {
  meal: CatalogMeal;
  isDone: boolean;
  isBatch: boolean;
  mealType: MealType;
  onToggle: () => void;
}) {
  return (
    <div className={`relative rounded-xl border ${MEAL_COLOR[mealType]} p-2 h-28 flex flex-col group
      hover:shadow-warm-sm transition-all ${isDone ? "opacity-60" : ""}`}
    >
      {/* Batch badge */}
      {isBatch && (
        <div className="absolute top-1.5 right-1.5" title="Можно готовить партией (≥4 порций)">
          <Package className="h-3 w-3 text-amber-400" />
        </div>
      )}

      {/* Completion toggle */}
      <button
        className="absolute top-1.5 left-1.5 z-10"
        onClick={onToggle}
        title={isDone ? "Снять отметку" : "Отметить как съеденное"}
      >
        {isDone
          ? <CheckCircle2 className="h-3.5 w-3.5 text-sage-400" />
          : <Circle className="h-3.5 w-3.5 text-parchment-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </button>

      {/* Name */}
      <p className={`text-2xs font-medium text-bark-300 leading-tight line-clamp-2 flex-1 mt-0.5 pl-4 pr-4 ${
        isDone ? "line-through text-stone-400" : ""
      }`}>
        {meal.name}
      </p>

      {/* Macros */}
      <div className="mt-auto">
        {meal.kcal != null && (
          <p className="text-2xs text-stone-400">{meal.kcal} ккал</p>
        )}
        {meal.protein_g != null && (
          <p className="text-2xs text-stone-300">Б {meal.protein_g}г</p>
        )}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  meals: CatalogMeal[];
  completions: Set<string>;
  batchMealNames: Set<string>;
  trainingDaysSet?: Set<number>;
  onToggleCompletion: (day: number, meal_type: string) => void;
}

function ListView({ meals, completions, batchMealNames, trainingDaysSet, onToggleCompletion }: ListViewProps) {
  const sorted = useMemo(
    () => [...meals].sort((a, b) => a.day - b.day || MEAL_TYPES.indexOf(a.meal_type as MealType) - MEAL_TYPES.indexOf(b.meal_type as MealType)),
    [meals]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
        <p className="text-sm text-muted-foreground">Нет данных по этой неделе</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((meal) => {
        const key = completionKey(meal.day, meal.meal_type);
        const isDone = completions.has(key);
        const isBatch = batchMealNames.has(meal.name);
        const mealType = meal.meal_type as MealType;
        const isTraining = isCatalogTrainingDay(meal.day, trainingDaysSet);

        return (
          <div
            key={meal.id}
            className={`rounded-2xl border border-parchment-200 bg-white p-4 flex gap-4 items-start ${isDone ? "opacity-60" : ""}`}
          >
            {/* Check-off */}
            <button
              className="mt-0.5 flex-shrink-0"
              onClick={() => onToggleCompletion(meal.day, meal.meal_type)}
            >
              {isDone
                ? <CheckCircle2 className="h-5 w-5 text-sage-400" />
                : <Circle className="h-5 w-5 text-parchment-300" />
              }
            </button>

            <div className="flex-1 min-w-0">
              {/* Labels */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-2xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${MEAL_COLOR[mealType]}`}>
                  {MEAL_LABEL_RU[mealType]}
                </span>
                <span className="text-2xs text-stone-400">{DAY_NAMES_RU[meal.day]}</span>
                <span className={`inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-full ${
                  isTraining ? "bg-vital-50 text-vital-500" : "bg-parchment-100 text-stone-400"
                }`}>
                  {isTraining ? <Dumbbell className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                  {isTraining ? "Зал" : "Отдых"}
                </span>
                {isBatch && (
                  <span className="inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500">
                    <Package className="h-2.5 w-2.5" />
                    Партия
                  </span>
                )}
              </div>

              {/* Name */}
              <p className={`font-display text-base font-semibold text-bark-300 leading-snug ${isDone ? "line-through text-stone-400" : ""}`}>
                {meal.name}
              </p>

              {/* Description */}
              {meal.description && (
                <p className="mt-1 text-xs text-stone-400 line-clamp-2">{meal.description}</p>
              )}

              {/* Macro pills */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meal.kcal != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-parchment-100 text-bark-200">
                    {meal.kcal} ккал
                  </span>
                )}
                {meal.protein_g != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-vital-50 text-vital-500">
                    Б {meal.protein_g}г
                  </span>
                )}
                {meal.carbs_g != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-500">
                    У {meal.carbs_g}г
                  </span>
                )}
                {meal.fat_g != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-sage-50 text-sage-500">
                    Ж {meal.fat_g}г
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shopping View ─────────────────────────────────────────────────────────────

interface ShoppingViewProps {
  items: ShoppingItem[];
  globalWeek: number;
}

function ShoppingView({ items }: ShoppingViewProps) {
  const [activeWindow, setActiveWindow] = useState<"all" | "A" | "B">("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (activeWindow === "all") return items;
    return items.filter((i) => i.shopping_window === activeWindow);
  }, [items, activeWindow]);

  // Group by category
  const byCategory = useMemo(() => {
    const map: Map<string, ShoppingItem[]> = new Map();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const totalItems = filtered.length;
  const checkedCount = [...filtered].filter((i) => checked.has(`${i.shopping_window}-${i.item_name}`)).length;

  return (
    <div className="space-y-5">
      {/* Window filter */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
          {[
            { key: "all", label: "Вся неделя" },
            { key: "A", label: "Дни 1–3" },
            { key: "B", label: "Дни 4–7" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveWindow(opt.key as "all" | "A" | "B")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeWindow === opt.key
                  ? "bg-white shadow-warm-sm text-bark-300"
                  : "text-stone-400 hover:text-bark-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-xs text-stone-400">
          <ShoppingCart className="h-3.5 w-3.5" />
          {checkedCount}/{totalItems} куплено
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-parchment-300 mb-4" />
          <p className="text-sm text-muted-foreground">Список покупок пуст</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...byCategory.entries()].map(([category, categoryItems]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{category}</p>
              <div className="rounded-2xl border border-parchment-200 bg-white divide-y divide-parchment-100">
                {categoryItems.map((item) => {
                  const itemKey = `${item.shopping_window}-${item.item_name}`;
                  const isChecked = checked.has(itemKey);
                  return (
                    <button
                      key={itemKey}
                      onClick={() => toggleCheck(itemKey)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-parchment-50 transition-colors"
                    >
                      <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                        isChecked ? "bg-sage-400 border-sage-400" : "border-parchment-300"
                      }`}>
                        {isChecked && (
                          <svg viewBox="0 0 12 12" className="w-full h-full p-0.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400" : "text-bark-300"}`}>
                        {item.item_name}
                      </span>
                      {item.quantity_per_person && (
                        <span className="text-2xs text-stone-400 flex-shrink-0">
                          {item.quantity_per_person}
                        </span>
                      )}
                      <span className={`text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        item.shopping_window === "A"
                          ? "bg-sage-50 text-sage-500"
                          : "bg-amber-50 text-amber-500"
                      }`}>
                        {item.shopping_window === "A" ? "1–3" : "4–7"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
