"use client";

import { useState, useTransition, useCallback } from "react";
import { Sparkles, RefreshCw, Lock, LockOpen, ChevronLeft, ChevronRight, Loader2, UtensilsCrossed } from "lucide-react";
import type { MealPlan, MealSlot, RecipeSummary } from "@/app/dashboard/planner/actions";
import { togglePinSlot } from "@/app/dashboard/planner/actions";
import { RecipeDetailModal } from "./RecipeDetailModal";

interface MealPlannerClientProps {
  initialPlan: MealPlan | null;
  initialRecipes: Record<string, RecipeSummary>;
  initialSavedIds: string[];
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
const DAY_FULL_RU = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDay(dateStr: string, idx: number): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_NAMES_RU[idx]} ${d.getDate()}`;
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

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  const end = new Date(weekStart + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  if (d.getMonth() === end.getMonth()) {
    return `${d.getDate()}–${end.getDate()} ${months[d.getMonth()]}`;
  }
  return `${d.getDate()} ${months[d.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}

export function MealPlannerClient({
  initialPlan,
  initialRecipes,
  initialSavedIds,
  weekStart: initialWeekStart,
}: MealPlannerClientProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [plan, setPlan] = useState<MealPlan | null>(initialPlan);
  const [recipes, setRecipes] = useState<Record<string, RecipeSummary>>(initialRecipes);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [generating, setGenerating] = useState(false);
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [pinPending, startPinTransition] = useTransition();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<RecipeSummary | null>(null);
  const [modalMealType, setModalMealType] = useState<string>("breakfast");
  const [modalDate, setModalDate] = useState<string>("");

  const dates = getWeekDates(weekStart);
  const today = new Date().toISOString().split("T")[0];

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setPlan(data.plan);
      setRecipes((prev) => ({ ...prev, ...data.recipes }));
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
      // Update local state
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedSlots = { ...prev.slots };
        updatedSlots[date] = { ...updatedSlots[date], [mealType]: data.slot };
        return { ...prev, slots: updatedSlots };
      });
      setRecipes((prev) => ({ ...prev, [data.recipe.id]: data.recipe }));
    } catch {
      // TODO: surface error
    } finally {
      setSwappingSlot(null);
    }
  }

  function togglePin(date: string, mealType: MealType) {
    if (!plan) return;
    // Optimistic update
    setPlan((prev) => {
      if (!prev) return prev;
      const updatedSlots = { ...prev.slots };
      const slot = updatedSlots[date]?.[mealType];
      if (!slot) return prev;
      updatedSlots[date] = { ...updatedSlots[date], [mealType]: { ...slot, pinned: !slot.pinned } };
      return { ...prev, slots: updatedSlots };
    });
    startPinTransition(async () => {
      await togglePinSlot(plan.id, date, mealType);
    });
  }

  function openRecipe(recipe: RecipeSummary, mealType: string, date: string) {
    setModalRecipe(recipe);
    setModalMealType(mealType);
    setModalDate(date);
    setModalOpen(true);
  }

  function handleSaveToggle(recipeId: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(recipeId); else next.delete(recipeId);
      return next;
    });
  }

  async function navigateWeek(offset: number) {
    const newWeekStart = offsetWeek(weekStart, offset);
    setWeekStart(newWeekStart);
    // Fetch plan for new week
    setGenerating(true);
    try {
      const res = await fetch(`/api/ai/meal-plan/get?week_start=${newWeekStart}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setRecipes((prev) => ({ ...prev, ...data.recipes }));
      } else {
        setPlan(null);
      }
    } catch {
      setPlan(null);
    } finally {
      setGenerating(false);
    }
  }

  const hasPlan = !!plan && Object.keys(plan.slots).length > 0;

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-bark-300">Планировщик питания</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ИИ-меню на неделю с учётом ваших целей и ограничений.
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

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg border border-parchment-200 text-stone-400 hover:bg-parchment-100 hover:text-bark-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-bark-300 min-w-[140px] text-center">
          {formatWeekLabel(weekStart)}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg border border-parchment-200 text-stone-400 hover:bg-parchment-100 hover:text-bark-300 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const ws = getWeekStart();
            if (ws !== weekStart) {
              setWeekStart(ws);
              setGenerating(false);
              setPlan(null);
            }
          }}
          className="ml-1 text-xs text-stone-400 hover:text-bark-300 transition-colors underline-offset-2 hover:underline"
        >
          Эта неделя
        </button>
      </div>

      {!hasPlan ? (
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
                Нажмите «Создать план» — ИИ подберёт 28 блюд с учётом ваших целей, ограничений и аллергенов.
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
      ) : (
        /* 7-day grid — horizontal scroll on mobile */
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dates.map((date, idx) => {
                const isToday = date === today;
                return (
                  <div key={date} className={`text-center py-1.5 rounded-lg ${isToday ? "bg-bark-300 text-primary-foreground" : "text-stone-400"}`}>
                    <p className="text-2xs font-semibold uppercase tracking-wide">{DAY_NAMES_RU[idx]}</p>
                    <p className={`text-xs mt-0.5 ${isToday ? "text-primary-foreground/80" : "text-stone-300"}`}>
                      {new Date(date + "T00:00:00").getDate()}
                    </p>
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
                    const slot = plan?.slots[date]?.[mealType] as MealSlot | undefined;
                    const recipe = slot?.recipe_id ? recipes[slot.recipe_id] : undefined;
                    const slotKey = `${date}-${mealType}`;
                    const isSwapping = swappingSlot === slotKey;

                    if (!slot || !recipe) {
                      return (
                        <div
                          key={date}
                          className="rounded-xl border border-dashed border-parchment-200 bg-parchment-50 h-24 flex items-center justify-center"
                        >
                          <span className="text-2xs text-stone-300">—</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={date}
                        className={`relative rounded-xl border ${MEAL_COLORS[mealType]} p-2 h-24 flex flex-col group cursor-pointer
                          hover:shadow-warm-sm transition-all`}
                        onClick={() => openRecipe(recipe, mealType, date)}
                      >
                        {/* Pin indicator */}
                        {slot.pinned && (
                          <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-amber-400" />
                        )}

                        {/* Recipe title */}
                        <p className="text-2xs font-medium text-bark-300 leading-tight line-clamp-2 flex-1">
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
                        <div className="absolute inset-0 rounded-xl bg-bark-400/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(date, mealType); }}
                            title={slot.pinned ? "Открепить" : "Закрепить"}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                          >
                            {slot.pinned ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                          </button>
                          {!slot.pinned && (
                            <button
                              onClick={(e) => { e.stopPropagation(); swapSlot(date, mealType); }}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily totals summary (when plan exists) */}
      {hasPlan && (
        <div className="mt-4 overflow-x-auto -mx-4 px-4">
          <div className="min-w-[640px]">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Итого за день (ккал)</p>
            <div className="grid grid-cols-7 gap-2">
              {dates.map((date) => {
                const daySlots = plan?.slots[date] ?? {};
                let totalKcal = 0;
                for (const mealType of MEAL_TYPES) {
                  const slot = daySlots[mealType] as MealSlot | undefined;
                  const recipe = slot?.recipe_id ? recipes[slot.recipe_id] : undefined;
                  totalKcal += recipe?.calories_per_serving ?? 0;
                }
                return (
                  <div key={date} className="text-center py-2 rounded-lg bg-parchment-100">
                    <p className="text-sm font-semibold text-bark-300">{Math.round(totalKcal)}</p>
                    <p className="text-2xs text-stone-400">ккал</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasPlan && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-2xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-amber-400" />
            <span>Закреплено (не заменяется при обновлении)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            <span>Заменить блюдо</span>
          </div>
        </div>
      )}

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
