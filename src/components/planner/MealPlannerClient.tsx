"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Sparkles, RefreshCw, Lock, LockOpen, Loader2, UtensilsCrossed,
  CheckCircle2, Circle, ShoppingCart, LayoutGrid, List, Dumbbell, Moon,
} from "lucide-react";
import type { MealPlan, MealSlot, RecipeSummary, MealCompletion } from "@/app/dashboard/planner/actions";
import { togglePinSlot, toggleMealCompletion } from "@/app/dashboard/planner/actions";
import { RecipeDetailModal } from "./RecipeDetailModal";
import { ShoppingListPanel } from "./ShoppingListPanel";

interface MealPlannerClientProps {
  initialPlan: MealPlan | null;
  initialRecipes: Record<string, RecipeSummary>;
  initialSavedIds: string[];
  initialCompletions: MealCompletion[];
  weekStart: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snacks: "Перекус",
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-50 border-amber-100",
  lunch: "bg-sage-50 border-sage-100",
  dinner: "bg-vital-50 border-vital-100",
  snacks: "bg-parchment-100 border-parchment-200",
};

const MEAL_ACCENT: Record<MealType, string> = {
  breakfast: "text-amber-400",
  lunch: "text-sage-400",
  dinner: "text-vital-400",
  snacks: "text-stone-400",
};

const DAY_NAMES_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Default training pattern: Mon Tue Thu Fri = зал, others = отдых
const DEFAULT_TRAINING: Record<number, string> = { 1: "зал", 2: "зал", 4: "зал", 5: "зал" };

function getDayTag(dateStr: string, trainingSchedule: Record<string, string>): string {
  if (trainingSchedule[dateStr]) return trainingSchedule[dateStr];
  const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();
  return DEFAULT_TRAINING[dayOfWeek] ?? "отдых";
}

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function offsetWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

type ViewMode = "schedule" | "recipes" | "shopping";
type WeekTab = 1 | 2 | 3 | 4;

export function MealPlannerClient({
  initialPlan,
  initialRecipes,
  initialSavedIds,
  initialCompletions,
  weekStart: baseWeekStart,
}: MealPlannerClientProps) {
  // The "base" week = week 1. All tabs are relative offsets from here.
  const [planGroupStart] = useState(() => getWeekStart(baseWeekStart));
  const [activeWeekTab, setActiveWeekTab] = useState<WeekTab>(1);
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");

  // Per-week plan cache
  const [planCache, setPlanCache] = useState<Record<string, MealPlan | null>>({
    [planGroupStart]: initialPlan,
  });
  const [recipesCache, setRecipesCache] = useState<Record<string, RecipeSummary>>(initialRecipes);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [completions, setCompletions] = useState<Set<string>>(
    new Set(initialCompletions.map((c) => `${c.slot_date}-${c.meal_type}`))
  );

  const [generating, setGenerating] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [completingSlot, setCompletingSlot] = useState<string | null>(null);
  const [, startPinTransition] = useTransition();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<RecipeSummary | null>(null);
  const [modalMealType, setModalMealType] = useState<string>("breakfast");
  const [modalDate, setModalDate] = useState<string>("");

  const currentWeekStart = offsetWeek(planGroupStart, activeWeekTab - 1);
  const plan = planCache[currentWeekStart] ?? null;
  const dates = getWeekDates(currentWeekStart);
  const today = new Date().toISOString().split("T")[0];
  const hasPlan = !!plan && Object.keys(plan.slots).length > 0;

  async function switchWeekTab(tab: WeekTab) {
    setActiveWeekTab(tab);
    const ws = offsetWeek(planGroupStart, tab - 1);
    if (planCache[ws] !== undefined) return; // already cached
    setLoadingWeek(true);
    try {
      const res = await fetch(`/api/ai/meal-plan/get?week_start=${ws}`);
      if (res.ok) {
        const data = await res.json();
        setPlanCache((prev) => ({ ...prev, [ws]: data.plan }));
        if (data.recipes) setRecipesCache((prev) => ({ ...prev, ...data.recipes }));
      } else {
        setPlanCache((prev) => ({ ...prev, [ws]: null }));
      }
    } catch {
      setPlanCache((prev) => ({ ...prev, [ws]: null }));
    } finally {
      setLoadingWeek(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: currentWeekStart }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setPlanCache((prev) => ({ ...prev, [currentWeekStart]: data.plan }));
      setRecipesCache((prev) => ({ ...prev, ...data.recipes }));
    } catch {
      // TODO: surface error toast
    } finally {
      setGenerating(false);
    }
  }

  async function swapSlot(date: string, mealType: MealType) {
    if (!plan) return;
    const key = `${date}-${mealType}`;
    setSwappingSlot(key);
    try {
      const res = await fetch("/api/ai/meal-plan/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, date, meal_type: mealType }),
      });
      if (!res.ok) throw new Error("Swap failed");
      const data = await res.json();
      setPlanCache((prev) => {
        const existing = prev[currentWeekStart];
        if (!existing) return prev;
        const updatedSlots = { ...existing.slots };
        updatedSlots[date] = { ...updatedSlots[date], [mealType]: data.slot };
        return { ...prev, [currentWeekStart]: { ...existing, slots: updatedSlots } };
      });
      setRecipesCache((prev) => ({ ...prev, [data.recipe.id]: data.recipe }));
    } catch {
      // TODO: surface error
    } finally {
      setSwappingSlot(null);
    }
  }

  function togglePin(date: string, mealType: MealType) {
    if (!plan) return;
    setPlanCache((prev) => {
      const existing = prev[currentWeekStart];
      if (!existing) return prev;
      const updatedSlots = { ...existing.slots };
      const slot = updatedSlots[date]?.[mealType];
      if (!slot) return prev;
      updatedSlots[date] = { ...updatedSlots[date], [mealType]: { ...slot, pinned: !slot.pinned } };
      return { ...prev, [currentWeekStart]: { ...existing, slots: updatedSlots } };
    });
    startPinTransition(async () => {
      await togglePinSlot(plan.id, date, mealType);
    });
  }

  async function handleToggleCompletion(date: string, mealType: string) {
    if (!plan) return;
    const key = `${date}-${mealType}`;
    setCompletingSlot(key);
    // Optimistic toggle
    setCompletions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    try {
      await toggleMealCompletion(plan.id, date, mealType);
    } catch {
      // Revert on error
      setCompletions((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    } finally {
      setCompletingSlot(null);
    }
  }

  const openRecipe = useCallback((recipe: RecipeSummary, mealType: string, date: string) => {
    setModalRecipe(recipe);
    setModalMealType(mealType);
    setModalDate(date);
    setModalOpen(true);
  }, []);

  function handleSaveToggle(recipeId: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(recipeId); else next.delete(recipeId);
      return next;
    });
  }

  // Collect all recipes for the current week (for Recipes view + Shopping)
  const weekRecipes: Array<{ recipe: RecipeSummary; mealType: MealType; date: string }> = [];
  if (plan) {
    for (const date of dates) {
      for (const mealType of MEAL_TYPES) {
        const slot = plan.slots[date]?.[mealType] as MealSlot | undefined;
        const recipe = slot?.recipe_id ? recipesCache[slot.recipe_id] : undefined;
        if (recipe) weekRecipes.push({ recipe, mealType, date });
      }
    }
  }

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-bark-300">Планировщик питания</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ИИ-меню на 4 недели с учётом ваших целей и ограничений.
          </p>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bark-300 text-primary-foreground text-sm font-medium
            hover:bg-bark-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-warm-sm"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Генерирую…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> {hasPlan ? "Обновить план" : "Создать план"}</>
          )}
        </button>
      </div>

      {/* Week tabs + View toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* 4-week tabs */}
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
          {([1, 2, 3, 4] as WeekTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => switchWeekTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeWeekTab === tab
                  ? "bg-white shadow-warm-sm text-bark-300"
                  : "text-stone-400 hover:text-bark-300"
              }`}
            >
              Неделя {tab}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1 ml-auto">
          <button
            onClick={() => setViewMode("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "schedule"
                ? "bg-white shadow-warm-sm text-bark-300"
                : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">График</span>
          </button>
          <button
            onClick={() => setViewMode("recipes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "recipes"
                ? "bg-white shadow-warm-sm text-bark-300"
                : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Рецепты</span>
          </button>
          <button
            onClick={() => setViewMode("shopping")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "shopping"
                ? "bg-white shadow-warm-sm text-bark-300"
                : "text-stone-400 hover:text-bark-300"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Список</span>
          </button>
        </div>
      </div>

      {/* Loading state for tab switch */}
      {loadingWeek && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sage-300" />
        </div>
      )}

      {!loadingWeek && !hasPlan ? (
        /* Empty state */
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
          {generating ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-sage-300 mb-4 animate-spin" />
              <p className="font-display text-lg font-semibold text-bark-200">Создаю план питания…</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                GigaChat подбирает рецепты под ваши цели и предпочтения.
              </p>
            </>
          ) : (
            <>
              <UtensilsCrossed className="mx-auto h-10 w-10 text-parchment-300 mb-4" />
              <p className="font-display text-lg font-semibold text-bark-200">Нет плана на эту неделю</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                Нажмите «Создать план» — ИИ подберёт блюда с учётом целей, ограничений и тренировок.
              </p>
              <button
                onClick={generatePlan}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bark-300 text-primary-foreground text-sm font-medium hover:bg-bark-400 transition-colors"
              >
                <Sparkles className="h-4 w-4" /> Создать план
              </button>
            </>
          )}
        </div>
      ) : !loadingWeek && viewMode === "schedule" ? (
        <ScheduleView
          plan={plan!}
          dates={dates}
          recipes={recipesCache}
          today={today}
          completions={completions}
          swappingSlot={swappingSlot}
          completingSlot={completingSlot}
          onOpenRecipe={openRecipe}
          onTogglePin={togglePin}
          onSwapSlot={swapSlot}
          onToggleCompletion={handleToggleCompletion}
        />
      ) : !loadingWeek && viewMode === "recipes" ? (
        <RecipesView
          weekRecipes={weekRecipes}
          completions={completions}
          completingSlot={completingSlot}
          onOpenRecipe={openRecipe}
          onToggleCompletion={handleToggleCompletion}
        />
      ) : !loadingWeek && viewMode === "shopping" ? (
        <ShoppingListPanel
          weekRecipes={weekRecipes}
          planGroupStart={planGroupStart}
          activeWeekOffset={activeWeekTab - 1}
        />
      ) : null}

      {/* Recipe detail modal */}
      <RecipeDetailModal
        recipe={modalRecipe}
        mealType={modalMealType}
        date={modalDate}
        isSaved={modalRecipe ? savedIds.has(modalRecipe.id) : false}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaveToggle={handleSaveToggle}
        onLogged={() => {}}
      />
    </div>
  );
}

// ── Schedule View ─────────────────────────────────────────────────────────────

interface ScheduleViewProps {
  plan: MealPlan;
  dates: string[];
  recipes: Record<string, RecipeSummary>;
  today: string;
  completions: Set<string>;
  swappingSlot: string | null;
  completingSlot: string | null;
  onOpenRecipe: (recipe: RecipeSummary, mealType: string, date: string) => void;
  onTogglePin: (date: string, mealType: MealType) => void;
  onSwapSlot: (date: string, mealType: MealType) => void;
  onToggleCompletion: (date: string, mealType: string) => void;
}

function ScheduleView({
  plan, dates, recipes, today, completions, swappingSlot, completingSlot,
  onOpenRecipe, onTogglePin, onSwapSlot, onToggleCompletion,
}: ScheduleViewProps) {
  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="min-w-[640px]">
          {/* Day headers with training tags */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {dates.map((date, idx) => {
              const isToday = date === today;
              const tag = getDayTag(date, plan.training_schedule ?? {});
              const isTraining = tag === "зал";
              return (
                <div key={date} className="text-center">
                  <div className={`py-1.5 rounded-lg ${isToday ? "bg-bark-300 text-primary-foreground" : "text-stone-400"}`}>
                    <p className="text-2xs font-semibold uppercase tracking-wide">{DAY_NAMES_RU[idx]}</p>
                    <p className={`text-xs mt-0.5 ${isToday ? "text-primary-foreground/80" : "text-stone-300"}`}>
                      {new Date(date + "T00:00:00").getDate()}
                    </p>
                  </div>
                  {/* Training tag */}
                  <div className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-2xs font-medium ${
                    isTraining
                      ? "bg-vital-50 text-vital-500"
                      : "bg-parchment-100 text-stone-400"
                  }`}>
                    {isTraining
                      ? <Dumbbell className="h-2.5 w-2.5" />
                      : <Moon className="h-2.5 w-2.5" />}
                    {tag}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meal type rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="mb-3">
              <p className={`text-2xs font-semibold uppercase tracking-wide mb-1.5 pl-1 ${MEAL_ACCENT[mealType]}`}>
                {MEAL_LABEL[mealType]}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {dates.map((date) => {
                  const slot = plan.slots[date]?.[mealType] as MealSlot | undefined;
                  const recipe = slot?.recipe_id ? recipes[slot.recipe_id] : undefined;
                  const slotKey = `${date}-${mealType}`;
                  const isSwapping = swappingSlot === slotKey;
                  const isDone = completions.has(slotKey);
                  const isCompleting = completingSlot === slotKey;

                  if (!slot || !recipe) {
                    return (
                      <div
                        key={date}
                        className="rounded-xl border border-dashed border-parchment-200 bg-parchment-50 h-28 flex items-center justify-center"
                      >
                        <span className="text-2xs text-stone-300">—</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={date}
                      className={`relative rounded-xl border ${MEAL_COLORS[mealType]} p-2 h-28 flex flex-col group cursor-pointer
                        hover:shadow-warm-sm transition-all ${isDone ? "opacity-70" : ""}`}
                      onClick={() => onOpenRecipe(recipe, mealType, date)}
                    >
                      {/* Pin indicator */}
                      {slot.pinned && (
                        <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-amber-400" />
                      )}

                      {/* Completion checkmark */}
                      <button
                        className="absolute top-1.5 left-1.5 z-10"
                        onClick={(e) => { e.stopPropagation(); onToggleCompletion(date, mealType); }}
                        disabled={isCompleting}
                        title={isDone ? "Отметить как несъеденное" : "Отметить как съеденное"}
                      >
                        {isCompleting
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sage-400" />
                          : isDone
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-sage-400" />
                            : <Circle className="h-3.5 w-3.5 text-parchment-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </button>

                      {/* Recipe title */}
                      <p className={`text-2xs font-medium text-bark-300 leading-tight line-clamp-2 flex-1 mt-0.5 pl-4 ${isDone ? "line-through text-stone-400" : ""}`}>
                        {recipe.title}
                      </p>

                      {/* Macros */}
                      <div className="mt-auto">
                        <p className="text-2xs text-stone-400">
                          {recipe.calories_per_serving != null ? `${Math.round(recipe.calories_per_serving)} ккал` : ""}
                        </p>
                        <p className="text-2xs text-stone-300">
                          {recipe.protein_per_serving != null ? `Б ${Math.round(recipe.protein_per_serving)}г` : ""}
                        </p>
                      </div>

                      {/* Hover actions */}
                      <div
                        className="absolute inset-0 rounded-xl bg-bark-400/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onTogglePin(date, mealType); }}
                          title={slot.pinned ? "Открепить" : "Закрепить"}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                        >
                          {slot.pinned ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                        </button>
                        {!slot.pinned && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSwapSlot(date, mealType); }}
                            disabled={isSwapping}
                            title="Заменить блюдо"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white disabled:opacity-50"
                          >
                            {isSwapping
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RefreshCw className="h-3 w-3" />
                            }
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleCompletion(date, mealType); }}
                          title={completions.has(`${date}-${mealType}`) ? "Снять отметку" : "Отметить съеденным"}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day totals — full macro bar */}
      <div className="mt-4 overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Итого за день</p>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const daySlots = plan.slots[date] ?? {};
              let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
              for (const mealType of MEAL_TYPES) {
                const slot = daySlots[mealType] as MealSlot | undefined;
                const recipe = slot?.recipe_id ? recipes[slot.recipe_id] : undefined;
                totalKcal += recipe?.calories_per_serving ?? 0;
                totalP += recipe?.protein_per_serving ?? 0;
                totalC += recipe?.carbs_per_serving ?? 0;
                totalF += recipe?.fat_per_serving ?? 0;
              }
              return (
                <div key={date} className="rounded-xl bg-parchment-100 p-2 text-center">
                  <p className="text-sm font-semibold text-bark-300">{Math.round(totalKcal)}</p>
                  <p className="text-2xs text-stone-400">ккал</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-2xs text-stone-400">Б {Math.round(totalP)}г</p>
                    <p className="text-2xs text-stone-400">У {Math.round(totalC)}г</p>
                    <p className="text-2xs text-stone-400">Ж {Math.round(totalF)}г</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-2xs text-stone-400">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3 text-vital-400" /> Зал
        </div>
        <div className="flex items-center gap-1.5">
          <Moon className="h-3 w-3 text-stone-300" /> Отдых
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-sage-400" /> Отмечено как съеденное
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-amber-400" /> Закреплено
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> Заменить
        </div>
      </div>
    </>
  );
}

// ── Recipes View ──────────────────────────────────────────────────────────────

interface RecipesViewProps {
  weekRecipes: Array<{ recipe: RecipeSummary; mealType: MealType; date: string }>;
  completions: Set<string>;
  completingSlot: string | null;
  onOpenRecipe: (recipe: RecipeSummary, mealType: string, date: string) => void;
  onToggleCompletion: (date: string, mealType: string) => void;
}

const MONTH_NAMES_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES_RU[d.getMonth()]}`;
}

function RecipesView({ weekRecipes, completions, completingSlot, onOpenRecipe, onToggleCompletion }: RecipesViewProps) {
  if (weekRecipes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
        <UtensilsCrossed className="mx-auto h-10 w-10 text-parchment-300 mb-4" />
        <p className="text-sm text-muted-foreground">Нет рецептов на эту неделю</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {weekRecipes.map(({ recipe, mealType, date }) => {
        const slotKey = `${date}-${mealType}`;
        const isDone = completions.has(slotKey);
        const isCompleting = completingSlot === slotKey;

        return (
          <div
            key={slotKey}
            className={`rounded-2xl border border-parchment-200 bg-white p-4 flex gap-4 items-start cursor-pointer hover:shadow-warm-sm transition-all ${isDone ? "opacity-70" : ""}`}
            onClick={() => onOpenRecipe(recipe, mealType, date)}
          >
            {/* Check-off */}
            <button
              className="mt-0.5 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleCompletion(date, mealType); }}
              disabled={isCompleting}
            >
              {isCompleting
                ? <Loader2 className="h-5 w-5 animate-spin text-sage-400" />
                : isDone
                  ? <CheckCircle2 className="h-5 w-5 text-sage-400" />
                  : <Circle className="h-5 w-5 text-parchment-300" />
              }
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Labels row */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-2xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${MEAL_COLORS[mealType]}`}>
                  {MEAL_LABEL[mealType]}
                </span>
                <span className="text-2xs text-stone-400">{formatDateRu(date)}</span>
              </div>

              {/* Dish name */}
              <p className={`font-display text-base font-semibold text-bark-300 leading-snug ${isDone ? "line-through text-stone-400" : ""}`}>
                {recipe.title}
              </p>

              {/* Description / first instruction */}
              {recipe.instructions?.[0] && (
                <p className="mt-1 text-xs text-stone-400 line-clamp-2">{recipe.instructions[0]}</p>
              )}

              {/* Macro pills */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.calories_per_serving != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-parchment-100 text-bark-200">
                    {Math.round(recipe.calories_per_serving)} ккал
                  </span>
                )}
                {recipe.protein_per_serving != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-vital-50 text-vital-500">
                    Б {Math.round(recipe.protein_per_serving)}г
                  </span>
                )}
                {recipe.carbs_per_serving != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-500">
                    У {Math.round(recipe.carbs_per_serving)}г
                  </span>
                )}
                {recipe.fat_per_serving != null && (
                  <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-sage-50 text-sage-500">
                    Ж {Math.round(recipe.fat_per_serving)}г
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
