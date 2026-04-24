"use client";

import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from "react";
import {
  Dumbbell, Moon, CheckCircle2, Circle, Loader2,
  ShoppingCart, LayoutGrid, List, Package, ChevronDown,
  Target, Flame, ChevronLeft, ChevronRight,
  ExternalLink, Copy, Check, Link2, X,
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
import { setPlanStartDate } from "@/app/dashboard/planner/actions";

function getThisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

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
  plan_start_date?: string | null;
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
  trainingDays?: number[];
  initialMeals: CatalogMeal[];
  initialCompletions: string[];
  initialConfig: UserPlanConfig | null;
  initialShopping: ShoppingItem[];
  goalContext?: UserGoalContext;
}

type ViewMode = "schedule" | "list" | "shopping";

// ── Meal colours by type ─────────────────────────────────────────────────────

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

const MEAL_DOT: Record<string, string> = {
  breakfast: "bg-amber-400",
  lunch:     "bg-sage-400",
  snack:     "bg-stone-300",
  dinner:    "bg-vital-400",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaleKcal(templateKcal: number, config: UserPlanConfig | null): number {
  if (!config || config.tdee_kcal === config.reference_tdee) return templateKcal;
  const scaled = Math.round(templateKcal * (config.tdee_kcal / config.reference_tdee));
  return Math.max(scaled, 1600);
}

function completionKey(day: number, meal_type: string): string {
  return `${day}-${meal_type}`;
}

/** Calculate calendar date for a meal given its global week and day offset (0-6). */
function getMealDate(globalWeek: number, dayInWeek: number, planStartDate: string | null): string | null {
  if (!planStartDate) return null;
  const startDate = new Date(planStartDate + "T00:00:00");
  // Don't adjust to Monday - use the chosen start date as week 1, day 0
  // Add weeks and days relative to the actual chosen start date
  startDate.setDate(startDate.getDate() + (globalWeek - 1) * 7 + dayInWeek);
  return startDate.toISOString().split("T")[0];
}

/** Filter meals that are before the plan start date. */
function filterMealsBeforeStart(meals: CatalogMeal[], globalWeek: number, planStartDate: string | null): CatalogMeal[] {
  if (!planStartDate) return meals;
  return meals.filter((meal) => {
    const mealDate = getMealDate(globalWeek, meal.day, planStartDate);
    return mealDate && mealDate >= planStartDate;
  });
}

// ── Moscow shops ─────────────────────────────────────────────────────────────

const MOSCOW_SHOPS = [
  { key: "pyaterochka", label: "Пятёрочка",   chipColor: "bg-red-50 text-red-500 border-red-200",     activeColor: "bg-red-500 text-white border-red-500" },
  { key: "magnit",      label: "Магнит",       chipColor: "bg-rose-50 text-rose-500 border-rose-200",  activeColor: "bg-rose-500 text-white border-rose-500" },
  { key: "perekrestok", label: "Перекрёсток",  chipColor: "bg-green-50 text-green-600 border-green-200", activeColor: "bg-green-600 text-white border-green-600" },
  { key: "vkusvill",    label: "ВкусВилл",     chipColor: "bg-emerald-50 text-emerald-600 border-emerald-200", activeColor: "bg-emerald-600 text-white border-emerald-600" },
  { key: "lenta",       label: "Лента",        chipColor: "bg-blue-50 text-blue-500 border-blue-200",  activeColor: "bg-blue-500 text-white border-blue-500" },
  { key: "auchan",      label: "Ашан",         chipColor: "bg-orange-50 text-orange-500 border-orange-200", activeColor: "bg-orange-500 text-white border-orange-500" },
  { key: "lavka",       label: "Яндекс Лавка", chipColor: "bg-yellow-50 text-yellow-600 border-yellow-200", activeColor: "bg-yellow-500 text-white border-yellow-500" },
  { key: "ozon",        label: "Ozon Fresh",   chipColor: "bg-sky-50 text-sky-500 border-sky-200",     activeColor: "bg-sky-500 text-white border-sky-500" },
  { key: "rynok",       label: "Рынок",        chipColor: "bg-stone-50 text-stone-500 border-stone-200", activeColor: "bg-stone-600 text-white border-stone-600" },
] as const;

// ── Main component ───────────────────────────────────────────────────────────

export function MultiPhasePlannerClient({
  initialMeals,
  initialCompletions,
  initialConfig,
  initialShopping,
  goalContext,
  trainingDays,
}: MultiPhasePlannerClientProps) {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(1);
  const [activeWeekInPhase, setActiveWeekInPhase] = useState<1 | 2>(1);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");

  const [mealsCache, setMealsCache] = useState<Record<number, CatalogMeal[]>>({ 1: initialMeals });
  const [completionsCache, setCompletionsCache] = useState<Record<number, Set<string>>>({
    1: new Set(initialCompletions),
  });
  const [shoppingCache, setShoppingCache] = useState<Record<number, ShoppingItem[]>>({
    1: initialShopping,
  });

  const [loadingWeek, setLoadingWeek] = useState(false);
  const [, startTransition] = useTransition();

  const [planStartDate, setPlanStartDateLocal] = useState<string | null>(
    initialConfig?.plan_start_date ?? null
  );
  const [editingStartDate, setEditingStartDate] = useState(false);

  // Auto-set plan_start_date to this week's Monday if not configured yet (TES-103)
  useEffect(() => {
    if (planStartDate === null) {
      const monday = getThisMonday();
      setPlanStartDate(monday).then(({ success }) => {
        if (success) setPlanStartDateLocal(monday);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalWeek = toGlobalWeek(activePhase, activeWeekInPhase);
  const isTrainingDay = (day: number) =>
    trainingDays ? trainingDays.includes(day) : isCatalogTrainingDay(day);
  const phase = PHASES[activePhase - 1];
  const rawMeals = mealsCache[globalWeek] ?? [];
  const meals = filterMealsBeforeStart(rawMeals, globalWeek, planStartDate);
  const completions = completionsCache[globalWeek] ?? new Set<string>();
  const shopping = shoppingCache[globalWeek] ?? [];

  const batchMealNames = useMemo(
    () => new Set(meals.filter((m) => m.is_batch).map((m) => m.name)),
    [meals]
  );

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
        setCompletionsCache((prev) => ({ ...prev, [gw]: new Set<string>(data.completions ?? []) }));
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
    await ensureWeek(toGlobalWeek(p, 1));
  }

  async function switchWeek(w: 1 | 2) {
    setActiveWeekInPhase(w);
    await ensureWeek(toGlobalWeek(activePhase, w));
  }

  const toggleCompletion = useCallback(
    (day: number, meal_type: string) => {
      const key = completionKey(day, meal_type);
      const gw = toGlobalWeek(activePhase, activeWeekInPhase);
      const isNowCompleted = !completionsCache[gw]?.has(key);

      setCompletionsCache((prev) => {
        const set = new Set(prev[gw] ?? []);
        if (isNowCompleted) set.add(key); else set.delete(key);
        return { ...prev, [gw]: set };
      });

      startTransition(() => {
        fetch("/api/planner/week", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: gw, day, meal_type, completed: isNowCompleted }),
        }).catch(() => {
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

  const completionCount = completions.size;
  const totalMeals = meals.length;
  const weekProgress = totalMeals > 0 ? Math.round((completionCount / totalMeals) * 100) : 0;

  return (
    <div className="max-w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-300">
            Планировщик питания
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            8 недель · 4 фазы · Российский рынок
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
            <span>Начало плана:</span>
            {editingStartDate ? (
              <input
                type="date"
                autoFocus
                defaultValue={planStartDate ?? getThisMonday()}
                className="px-1.5 py-0.5 rounded-md border border-parchment-200 bg-white text-bark-300 text-xs focus:outline-none focus:ring-1 focus:ring-bark-100"
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setPlanStartDate(val).then(({ success }) => {
                    if (success) setPlanStartDateLocal(val);
                  });
                  setEditingStartDate(false);
                }}
                onBlur={() => setEditingStartDate(false)}
              />
            ) : (
              <button
                onClick={() => setEditingStartDate(true)}
                className="text-bark-200 hover:text-bark-300 underline underline-offset-2 transition-colors"
              >
                {planStartDate
                  ? new Date(planStartDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
                  : "не задано"}
              </button>
            )}
          </div>
        </div>

        {/* Weekly progress badge */}
        {totalMeals > 0 && (
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-stone-400">
              Неделя {activeWeekInPhase}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-parchment-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-400 rounded-full transition-all duration-500"
                  style={{ width: `${weekProgress}%` }}
                />
              </div>
              <span className="text-xs text-stone-400 tabular-nums">
                {completionCount}/{totalMeals}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Phase selector ───────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="flex items-center gap-1 bg-parchment-100 rounded-2xl p-1 overflow-x-auto">
          {PHASES.map((ph) => {
            const isActive = activePhase === ph.number;
            return (
              <button
                key={ph.number}
                onClick={() => switchPhase(ph.number as 1 | 2 | 3 | 4)}
                className={`flex-1 min-w-0 flex flex-col items-center px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-white shadow-warm-sm text-bark-300"
                    : "text-stone-400 hover:text-bark-300"
                }`}
              >
                <span className={`text-xs font-bold leading-none mb-0.5 ${
                  isActive ? "text-bark-300" : "text-stone-400"
                }`}>
                  Ф{ph.number}
                </span>
                <span className={`text-2xs leading-none ${
                  isActive ? "text-bark-200" : "text-stone-300"
                }`}>
                  {ph.nameRu}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Phase guidance banner ────────────────────────────────────────── */}
      <PhaseBanner phase={phase} config={initialConfig} goalContext={goalContext} />

      {/* ── Week + view controls ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
          {([1, 2] as const).map((w) => (
            <button
              key={w}
              onClick={() => switchWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeWeekInPhase === w
                  ? "bg-white shadow-warm-sm text-bark-300"
                  : "text-stone-400 hover:text-bark-300"
              }`}
            >
              Неделя {w}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("schedule")}
            title="График"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "schedule" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            title="Список"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "list" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("shopping")}
            title="Покупки"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "shopping" ? "bg-white shadow-warm-sm text-bark-300" : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loadingWeek ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-sage-300" />
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
          onToggleCompletion={toggleCompletion}
          isTrainingDay={isTrainingDay}
        />
      ) : viewMode === "list" ? (
        <ListView
          meals={meals}
          completions={completions}
          batchMealNames={batchMealNames}
          onToggleCompletion={toggleCompletion}
          isTrainingDay={isTrainingDay}
        />
      ) : (
        <ShoppingView items={shopping} globalWeek={globalWeek} />
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
  const [expanded, setExpanded] = useState(false);
  const goal = goalContext?.primaryGoal ?? "general_wellness";
  const edFlag = goalContext?.eatingDisorderFlag ?? false;

  const goalCalorieTarget = getPhaseCalorieTarget(goal, phase.number);
  const trainingKcal = scaleKcal(goalCalorieTarget.training, config);
  const restKcal = scaleKcal(goalCalorieTarget.rest, config);
  const guidance = getPhaseGuidance(goal, phase.number, edFlag);

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-parchment-100 to-parchment-50 border border-parchment-200 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Target className="h-4 w-4 text-bark-200 flex-shrink-0" />
        <span className="flex-1 text-sm text-bark-300 line-clamp-1">{guidance}</span>
        {!edFlag && (
          <div className="flex items-center gap-3 text-xs text-stone-400 flex-shrink-0">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3 text-vital-400" />
              {trainingKcal.toLocaleString("ru")}
            </span>
            <span className="flex items-center gap-1">
              <Moon className="h-3 w-3 text-stone-300" />
              {restKcal.toLocaleString("ru")}
            </span>
          </div>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-stone-300 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-parchment-200 px-4 py-3">
          <p className="text-sm text-bark-300 mb-3 leading-relaxed">{guidance}</p>
          {!edFlag && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-vital-50 border border-vital-100 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Dumbbell className="h-3.5 w-3.5 text-vital-500" />
                  <span className="text-xs font-semibold text-vital-500">День зала</span>
                </div>
                <p className="text-xl font-bold text-bark-300 leading-none">
                  {trainingKcal.toLocaleString("ru")}
                  <span className="text-xs font-normal text-stone-400 ml-1">ккал</span>
                </p>
                <p className="mt-1.5 text-2xs text-stone-400">
                  Б{phase.macros.training.protein_g} · У{phase.macros.training.carbs_g} · Ж{phase.macros.training.fat_g}
                </p>
              </div>
              <div className="rounded-xl bg-parchment-100 border border-parchment-200 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Moon className="h-3.5 w-3.5 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-400">День отдыха</span>
                </div>
                <p className="text-xl font-bold text-bark-300 leading-none">
                  {restKcal.toLocaleString("ru")}
                  <span className="text-xs font-normal text-stone-400 ml-1">ккал</span>
                </p>
                <p className="mt-1.5 text-2xs text-stone-400">
                  Б{phase.macros.rest.protein_g} · У{phase.macros.rest.carbs_g} · Ж{phase.macros.rest.fat_g}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
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
  onToggleCompletion: (day: number, meal_type: string) => void;
  isTrainingDay: (day: number) => boolean;
}

function ScheduleView({
  meals, completions, batchMealNames, dayTotals, phase, config, goalContext, onToggleCompletion, isTrainingDay,
}: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const byDay = useMemo(() => {
    const map: Record<number, Record<string, CatalogMeal>> = {};
    for (const meal of meals) {
      if (!map[meal.day]) map[meal.day] = {};
      map[meal.day][meal.meal_type] = meal;
    }
    return map;
  }, [meals]);

  const days = Array.from({ length: 7 }, (_, i) => i);
  const edFlag = goalContext?.eatingDisorderFlag ?? false;

  const dayCompletionCounts = useMemo(() => {
    const counts: Record<number, { done: number; total: number }> = {};
    for (const day of days) {
      const dayMeals = MEAL_TYPES.filter((mt) => byDay[day]?.[mt]);
      const done = dayMeals.filter((mt) => completions.has(completionKey(day, mt))).length;
      counts[day] = { done, total: dayMeals.length };
    }
    return counts;
  }, [byDay, completions]);

  return (
    <>
      {/* ── Mobile: Day picker strip ─────────────────────────────────────── */}
      <div className="md:hidden mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((day) => {
            const isTraining = isTrainingDay(day);
            const isSelected = selectedDay === day;
            const { done, total } = dayCompletionCounts[day] ?? { done: 0, total: 0 };
            const allDone = total > 0 && done === total;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 w-12 py-2 rounded-xl border transition-all ${
                  isSelected
                    ? isTraining
                      ? "bg-vital-50 border-vital-200 shadow-warm-sm"
                      : "bg-white border-parchment-300 shadow-warm-sm"
                    : "bg-parchment-50 border-transparent"
                }`}
              >
                <span className={`text-2xs font-semibold uppercase ${
                  isSelected ? (isTraining ? "text-vital-500" : "text-bark-300") : "text-stone-400"
                }`}>
                  {DAY_NAMES_RU[day]}
                </span>
                <span className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  isTraining ? "bg-vital-100" : "bg-parchment-200"
                }`}>
                  {isTraining
                    ? <Dumbbell className="h-2.5 w-2.5 text-vital-500" />
                    : <Moon className="h-2.5 w-2.5 text-stone-400" />
                  }
                </span>
                {total > 0 && (
                  <span className={`h-1 w-5 rounded-full transition-all ${
                    allDone ? "bg-sage-400" : done > 0 ? "bg-amber-300" : "bg-parchment-200"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day header + prev/next arrows */}
        <div className="flex items-center justify-between mt-3 mb-3">
          <button
            onClick={() => setSelectedDay((d) => Math.max(0, d - 1))}
            disabled={selectedDay === 0}
            className="p-1.5 rounded-lg text-stone-400 hover:text-bark-300 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-bark-300">
              {DAY_NAMES_RU[selectedDay]}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isTrainingDay(selectedDay)
                ? "bg-vital-50 text-vital-500"
                : "bg-parchment-100 text-stone-400"
            }`}>
              {isTrainingDay(selectedDay)
                ? <><Dumbbell className="h-3 w-3" /> Зал</>
                : <><Moon className="h-3 w-3" /> Отдых</>
              }
            </span>
          </div>

          <button
            onClick={() => setSelectedDay((d) => Math.min(6, d + 1))}
            disabled={selectedDay === 6}
            className="p-1.5 rounded-lg text-stone-400 hover:text-bark-300 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Meal cards for selected day */}
        <div className="space-y-2">
          {MEAL_TYPES.map((mealType) => {
            const meal = byDay[selectedDay]?.[mealType];
            if (!meal) return null;
            const key = completionKey(selectedDay, mealType);
            const isDone = completions.has(key);
            const isBatch = batchMealNames.has(meal.name);
            return (
              <MealCardMobile
                key={mealType}
                meal={meal}
                isDone={isDone}
                isBatch={isBatch}
                mealType={mealType}
                onToggle={() => onToggleCompletion(selectedDay, mealType)}
              />
            );
          })}
        </div>

        {/* Mobile day totals */}
        {!edFlag && (() => {
          const totals = dayTotals[selectedDay] ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
          const isTraining = isTrainingDay(selectedDay);
          const goalCalTarget = getPhaseCalorieTarget(goalContext?.primaryGoal ?? "general_wellness", phase.number);
          const target = scaleKcal(isTraining ? goalCalTarget.training : goalCalTarget.rest, config);
          const pct = target > 0 ? Math.min(Math.round((totals.kcal / target) * 100), 100) : 0;
          const inRange = pct >= 90 && pct <= 110;
          return (
            <div className="mt-3 rounded-2xl bg-parchment-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-stone-400">Итого за день</span>
                <span className={`text-sm font-bold ${inRange ? "text-sage-500" : "text-bark-300"}`}>
                  {Math.round(totals.kcal)} / {target.toLocaleString("ru")} ккал
                </span>
              </div>
              <div className="h-1.5 bg-parchment-200 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all ${inRange ? "bg-sage-400" : "bg-amber-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-stone-400">
                <span>Белки {Math.round(totals.protein_g)}г</span>
                <span>Углев. {Math.round(totals.carbs_g)}г</span>
                <span>Жиры {Math.round(totals.fat_g)}г</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Desktop: 7-column grid ───────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {days.map((day) => {
                const isTraining = isTrainingDay(day);
                return (
                  <div key={day} className="text-center">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">
                      {DAY_NAMES_RU[day]}
                    </p>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isTraining ? "bg-vital-50 text-vital-500" : "bg-parchment-100 text-stone-400"
                    }`}>
                      {isTraining
                        ? <Dumbbell className="h-3 w-3" />
                        : <Moon className="h-3 w-3" />
                      }
                      <span>{isTraining ? "Зал" : "Отдых"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Meal rows */}
            {MEAL_TYPES.map((mealType) => (
              <div key={mealType} className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${MEAL_DOT[mealType]}`} />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${MEAL_ACCENT[mealType]}`}>
                    {MEAL_LABEL_RU[mealType]}
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const meal = byDay[day]?.[mealType];
                    if (!meal) {
                      return (
                        <div
                          key={day}
                          className="rounded-xl border border-dashed border-parchment-200 bg-parchment-50 h-28 flex items-center justify-center"
                        >
                          <span className="text-xs text-stone-300">—</span>
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

            {/* Day totals */}
            {!edFlag && (
              <div className="mt-4">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 pl-1">
                  Итого за день
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const totals = dayTotals[day] ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
                    const isTraining = isTrainingDay(day);
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
                    return (
                      <div key={day} className="rounded-xl bg-parchment-100 p-2 text-center">
                        <p className={`text-sm font-semibold ${inRange ? "text-sage-500" : "text-bark-300"}`}>
                          {Math.round(totals.kcal)}
                        </p>
                        <p className="text-2xs text-stone-400">/ {target.toLocaleString("ru")}</p>
                        <div className="mt-1 h-1 bg-parchment-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${inRange ? "bg-sage-400" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
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
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-1.5"><Dumbbell className="h-3 w-3 text-vital-400" /> День зала</div>
          <div className="flex items-center gap-1.5"><Moon className="h-3 w-3 text-stone-300" /> День отдыха</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-sage-400" /> Съедено</div>
          <div className="flex items-center gap-1.5"><Package className="h-3 w-3 text-amber-400" /> Можно готовить партией</div>
          <div className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-sage-400" /> Зелёная полоска = цель ±10%</div>
        </div>
      </div>
    </>
  );
}

// ── Meal Card (desktop grid) ─────────────────────────────────────────────────

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
    <div
      className={`relative rounded-xl border ${MEAL_COLOR[mealType]} p-2 h-28 flex flex-col
        transition-all ${isDone ? "opacity-55" : "hover:shadow-warm-sm"}`}
    >
      {isBatch && (
        <div className="absolute top-1.5 right-1.5" title="Можно готовить партией">
          <Package className="h-3 w-3 text-amber-400" />
        </div>
      )}

      <button
        className="absolute top-1.5 left-1.5 z-10 rounded-full"
        onClick={onToggle}
        title={isDone ? "Снять отметку" : "Отметить как съеденное"}
      >
        {isDone
          ? <CheckCircle2 className="h-3.5 w-3.5 text-sage-400" />
          : <Circle className="h-3.5 w-3.5 text-parchment-300 hover:text-sage-300 transition-colors" />
        }
      </button>

      <p className={`text-2xs font-medium text-bark-300 leading-tight line-clamp-2 flex-1 mt-0.5 pl-4 pr-4 ${
        isDone ? "line-through text-stone-400" : ""
      }`}>
        {meal.name}
      </p>

      <div className="mt-auto space-y-0.5">
        {meal.kcal != null && (
          <p className="text-2xs text-stone-400 font-medium">{meal.kcal} ккал</p>
        )}
        <p className="text-2xs text-stone-300 leading-tight">
          {meal.protein_g != null && `Б${meal.protein_g} `}
          {meal.carbs_g != null && `У${meal.carbs_g} `}
          {meal.fat_g != null && `Ж${meal.fat_g}`}
        </p>
      </div>
    </div>
  );
}

// ── Meal Card (mobile) ───────────────────────────────────────────────────────

function MealCardMobile({
  meal, isDone, isBatch, mealType, onToggle,
}: {
  meal: CatalogMeal;
  isDone: boolean;
  isBatch: boolean;
  mealType: MealType;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-2xl border ${MEAL_COLOR[mealType]} transition-all ${isDone ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1 -m-1 rounded-full"
          title={isDone ? "Снять отметку" : "Отметить как съеденное"}
        >
          {isDone
            ? <CheckCircle2 className="h-5 w-5 text-sage-400" />
            : <Circle className="h-5 w-5 text-parchment-300" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-2xs font-semibold uppercase tracking-wide ${MEAL_ACCENT[mealType]}`}>
              {MEAL_LABEL_RU[mealType]}
            </span>
            {isBatch && (
              <span className="inline-flex items-center gap-0.5 text-2xs text-amber-500">
                <Package className="h-2.5 w-2.5" /> Партия
              </span>
            )}
          </div>
          <p className={`text-sm font-semibold text-bark-300 leading-snug ${isDone ? "line-through text-stone-400" : ""}`}>
            {meal.name}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          {meal.kcal != null && (
            <p className="text-xs font-medium text-bark-200">{meal.kcal} ккал</p>
          )}
          <p className="text-2xs text-stone-400 leading-tight">
            {meal.protein_g != null && `Б${meal.protein_g} `}
            {meal.carbs_g != null && `У${meal.carbs_g} `}
            {meal.fat_g != null && `Ж${meal.fat_g}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  meals: CatalogMeal[];
  completions: Set<string>;
  batchMealNames: Set<string>;
  onToggleCompletion: (day: number, meal_type: string) => void;
  isTrainingDay: (day: number) => boolean;
}

function ListView({ meals, completions, batchMealNames, onToggleCompletion, isTrainingDay }: ListViewProps) {
  const sorted = useMemo(
    () => [...meals].sort(
      (a, b) => a.day - b.day || MEAL_TYPES.indexOf(a.meal_type as MealType) - MEAL_TYPES.indexOf(b.meal_type as MealType)
    ),
    [meals]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
        <p className="text-sm text-muted-foreground">Нет данных по этой неделе</p>
      </div>
    );
  }

  const byDay = useMemo(() => {
    const groups: Array<{ day: number; meals: CatalogMeal[] }> = [];
    let current: { day: number; meals: CatalogMeal[] } | null = null;
    for (const meal of sorted) {
      if (!current || current.day !== meal.day) {
        current = { day: meal.day, meals: [] };
        groups.push(current);
      }
      current.meals.push(meal);
    }
    return groups;
  }, [sorted]);

  return (
    <div className="space-y-4">
      {byDay.map(({ day, meals: dayMeals }) => {
        const isTraining = isTrainingDay(day);
        return (
          <div key={day}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {DAY_NAMES_RU[day]}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                isTraining ? "bg-vital-50 text-vital-500" : "bg-parchment-100 text-stone-400"
              }`}>
                {isTraining ? <Dumbbell className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                {isTraining ? "Зал" : "Отдых"}
              </span>
              <div className="flex-1 h-px bg-parchment-200" />
            </div>

            <div className="space-y-2">
              {dayMeals.map((meal) => {
                const key = completionKey(meal.day, meal.meal_type);
                const isDone = completions.has(key);
                const isBatch = batchMealNames.has(meal.name);
                const mealType = meal.meal_type as MealType;

                return (
                  <div
                    key={meal.id}
                    className={`rounded-2xl border border-parchment-200 bg-white transition-opacity ${isDone ? "opacity-55" : ""}`}
                  >
                    <div className="flex items-start gap-3 p-4">
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
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-2xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${MEAL_COLOR[mealType]}`}>
                            {MEAL_LABEL_RU[mealType]}
                          </span>
                          {isBatch && (
                            <span className="inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500">
                              <Package className="h-2.5 w-2.5" /> Партия
                            </span>
                          )}
                        </div>

                        <p className={`font-display text-base font-semibold text-bark-300 leading-snug ${isDone ? "line-through text-stone-400" : ""}`}>
                          {meal.name}
                        </p>

                        {meal.description && (
                          <p className="mt-1 text-xs text-stone-400 line-clamp-2">{meal.description}</p>
                        )}

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
                  </div>
                );
              })}
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

function ShoppingView({ items, globalWeek }: ShoppingViewProps) {
  const [activeWindow, setActiveWindow] = useState<"all" | "A" | "B">("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  // shop assignments: itemKey → shopKey  (persisted per-week)
  const [shopAssignments, setShopAssignments] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(`np_shops_${globalWeek}`) ?? "{}"); } catch { return {}; }
  });

  // ingredient links: itemKey → url  (persisted per-week)
  const [links, setLinks] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(`np_links_${globalWeek}`) ?? "{}"); } catch { return {}; }
  });

  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist shop assignments
  useEffect(() => {
    localStorage.setItem(`np_shops_${globalWeek}`, JSON.stringify(shopAssignments));
  }, [shopAssignments, globalWeek]);

  // Persist links
  useEffect(() => {
    localStorage.setItem(`np_links_${globalWeek}`, JSON.stringify(links));
  }, [links, globalWeek]);

  // Close shop picker on outside click
  useEffect(() => {
    if (!assigningFor) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAssigningFor(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [assigningFor]);

  const filtered = useMemo(() => {
    let base = activeWindow === "all" ? items : items.filter((i) => i.shopping_window === activeWindow);
    if (selectedShop) {
      base = base.filter((i) => shopAssignments[`${i.shopping_window}-${i.item_name}`] === selectedShop);
    }
    return base;
  }, [items, activeWindow, selectedShop, shopAssignments]);

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

  function assignShop(itemKey: string, shopKey: string | null) {
    setShopAssignments((prev) => {
      const next = { ...prev };
      if (shopKey === null) delete next[itemKey]; else next[itemKey] = shopKey;
      return next;
    });
    setAssigningFor(null);
  }

  function saveLink(itemKey: string, url: string) {
    setLinks((prev) => {
      const next = { ...prev };
      if (!url.trim()) delete next[itemKey]; else next[itemKey] = url.trim();
      return next;
    });
    setEditingLink(null);
  }

  function copyShopList() {
    const shopLabel = MOSCOW_SHOPS.find((s) => s.key === selectedShop)?.label ?? selectedShop ?? "";
    const lines = [`Список покупок — ${shopLabel}`, ""];
    for (const [cat, catItems] of byCategory.entries()) {
      lines.push(`${cat}`);
      for (const item of catItems) {
        const qty = item.quantity_per_person ? ` — ${item.quantity_per_person}` : "";
        const url = links[`${item.shopping_window}-${item.item_name}`];
        lines.push(`• ${item.item_name}${qty}${url ? ` (${url})` : ""}`);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const totalItems = filtered.length;
  const checkedCount = [...filtered].filter((i) => checked.has(`${i.shopping_window}-${i.item_name}`)).length;

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* ── Shop selector strip ───────────────────────────────────────── */}
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wide text-stone-400 mb-2 px-1">Магазин</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedShop(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              selectedShop === null
                ? "bg-bark-300 text-white border-bark-300"
                : "bg-parchment-50 border-parchment-200 text-stone-400 hover:text-bark-300"
            }`}
          >
            Все
          </button>
          {MOSCOW_SHOPS.map((shop) => (
            <button
              key={shop.key}
              onClick={() => setSelectedShop(selectedShop === shop.key ? null : shop.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                selectedShop === shop.key ? shop.activeColor : "bg-parchment-50 border-parchment-200 text-stone-400 hover:text-bark-300"
              }`}
            >
              {shop.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Window filter + copy + progress ──────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
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

        {selectedShop && (
          <button
            onClick={copyShopList}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              copied
                ? "bg-sage-50 border-sage-200 text-sage-600"
                : "bg-parchment-50 border-parchment-200 text-stone-500 hover:text-bark-300"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Скопировано" : "Скопировать список"}
          </button>
        )}

        {totalItems > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-stone-400">
            <div className="w-16 h-1.5 bg-parchment-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-400 rounded-full transition-all"
                style={{ width: `${totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0}%` }}
              />
            </div>
            <span className="tabular-nums">{checkedCount}/{totalItems}</span>
          </div>
        )}
      </div>

      {/* ── Item list ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-parchment-300 mb-4" />
          <p className="text-sm text-muted-foreground">
            {selectedShop ? "Нет товаров для этого магазина" : "Список покупок пуст"}
          </p>
          {selectedShop && (
            <p className="mt-1 text-xs text-stone-400">Назначьте товары магазину, нажав «—» рядом с ними</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {[...byCategory.entries()].map(([category, categoryItems]) => {
            const catChecked = categoryItems.filter(
              (i) => checked.has(`${i.shopping_window}-${i.item_name}`)
            ).length;
            const allCatDone = catChecked === categoryItems.length;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{category}</p>
                  <div className="flex-1 h-px bg-parchment-200" />
                  <span className={`text-2xs tabular-nums ${allCatDone ? "text-sage-500" : "text-stone-300"}`}>
                    {catChecked}/{categoryItems.length}
                  </span>
                </div>

                <div className="rounded-2xl border border-parchment-200 bg-white overflow-hidden">
                  {categoryItems.map((item, idx) => {
                    const itemKey = `${item.shopping_window}-${item.item_name}`;
                    const isChecked = checked.has(itemKey);
                    const assignedShopKey = shopAssignments[itemKey];
                    const assignedShopDef = MOSCOW_SHOPS.find((s) => s.key === assignedShopKey);
                    const itemLink = links[itemKey];
                    const isEditingThisLink = editingLink === itemKey;
                    const isAssigningThis = assigningFor === itemKey;

                    return (
                      <div
                        key={itemKey}
                        className={idx > 0 ? "border-t border-parchment-100" : ""}
                      >
                        {/* Main row */}
                        <div className={`flex items-center gap-2 px-4 py-3 ${isChecked ? "opacity-55" : ""}`}>
                          {/* Check circle */}
                          <button
                            onClick={() => toggleCheck(itemKey)}
                            className="flex-shrink-0"
                          >
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isChecked ? "bg-sage-400 border-sage-400" : "border-parchment-300 hover:border-sage-300"
                            }`}>
                              {isChecked && (
                                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="2,6 5,9 10,3" />
                                </svg>
                              )}
                            </div>
                          </button>

                          {/* Name */}
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className={`text-sm truncate ${isChecked ? "line-through text-stone-400" : "text-bark-300"}`}>
                              {item.item_name}
                            </span>
                            {itemLink && !isEditingThisLink && (
                              <a
                                href={itemLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0 text-sage-400 hover:text-sage-500 transition-colors"
                                title={itemLink}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {/* Quantity */}
                          {item.quantity_per_person && (
                            <span className="text-xs text-stone-400 flex-shrink-0 hidden sm:inline">
                              {item.quantity_per_person}
                            </span>
                          )}

                          {/* Window badge */}
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium hidden sm:inline ${
                            item.shopping_window === "A"
                              ? "bg-sage-50 text-sage-500"
                              : "bg-amber-50 text-amber-500"
                          }`}>
                            {item.shopping_window === "A" ? "1–3" : "4–7"}
                          </span>

                          {/* Link button */}
                          <button
                            onClick={() => {
                              if (isEditingThisLink) {
                                setEditingLink(null);
                              } else {
                                setLinkDraft(itemLink ?? "");
                                setEditingLink(itemKey);
                                setAssigningFor(null);
                              }
                            }}
                            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                              itemLink
                                ? "text-sage-400 hover:text-sage-500"
                                : "text-stone-300 hover:text-stone-400"
                            }`}
                            title="Ссылка на товар"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Shop badge + picker */}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => {
                                setAssigningFor(isAssigningThis ? null : itemKey);
                                setEditingLink(null);
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-2xs font-medium transition-colors ${
                                assignedShopDef
                                  ? assignedShopDef.chipColor
                                  : "border-parchment-200 bg-parchment-50 text-stone-400 hover:text-bark-300"
                              }`}
                              title="Выбрать магазин"
                            >
                              {assignedShopDef ? assignedShopDef.label : "—"}
                            </button>
                            {isAssigningThis && (
                              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-parchment-200 rounded-xl shadow-lg p-1.5 min-w-[150px]">
                                <button
                                  onClick={() => assignShop(itemKey, null)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-stone-400 hover:bg-parchment-50 rounded-lg"
                                >
                                  — Не назначен
                                </button>
                                {MOSCOW_SHOPS.map((shop) => (
                                  <button
                                    key={shop.key}
                                    onClick={() => assignShop(itemKey, shop.key)}
                                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-parchment-50 ${
                                      assignedShopKey === shop.key ? "font-semibold text-bark-300" : "text-stone-500"
                                    }`}
                                  >
                                    {shop.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Link editor row */}
                        {isEditingThisLink && (
                          <div className="px-4 py-2.5 bg-parchment-50 border-t border-parchment-100 flex items-center gap-2">
                            <Link2 className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                            <input
                              autoFocus
                              type="url"
                              value={linkDraft}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveLink(itemKey, linkDraft);
                                if (e.key === "Escape") setEditingLink(null);
                              }}
                              placeholder="https://..."
                              className="flex-1 text-xs bg-transparent border-none outline-none text-bark-300 placeholder:text-stone-300"
                            />
                            <button
                              onClick={() => saveLink(itemKey, linkDraft)}
                              className="flex-shrink-0 p-1 rounded-lg bg-sage-400 text-white hover:bg-sage-500 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            {itemLink && (
                              <button
                                onClick={() => saveLink(itemKey, "")}
                                className="flex-shrink-0 p-1 rounded-lg text-stone-400 hover:text-red-400 transition-colors"
                                title="Удалить ссылку"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
