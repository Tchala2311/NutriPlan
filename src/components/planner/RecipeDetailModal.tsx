"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, Flame, Beef, Wheat, Droplets, Bookmark, BookmarkCheck, CheckCheck, X, Repeat2 } from "lucide-react";
import type { RecipeSummary } from "@/app/dashboard/planner/actions";
import { saveRecipeToLibrary, unsaveRecipe, logRecipeMeal } from "@/app/dashboard/planner/actions";

interface RecipeDetailModalProps {
  recipe: RecipeSummary | null;
  mealType: string;
  date: string;
  isSaved: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveToggle: (recipeId: string, saved: boolean) => void;
  onLogged: () => void;
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snacks: "Перекус",
};

function MacroChip({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${color}`}>
      <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-bark-300 mt-0.5">
        {value != null ? `${Math.round(value)}` : "—"}<span className="text-xs font-normal text-stone-400 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

export function RecipeDetailModal({
  recipe,
  mealType,
  date,
  isSaved,
  open,
  onOpenChange,
  onSaveToggle,
  onLogged,
}: RecipeDetailModalProps) {
  const [logged, setLogged] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!recipe) return null;

  function handleSaveToggle() {
    if (!recipe) return;
    startTransition(async () => {
      if (isSaved) {
        await unsaveRecipe(recipe.id);
        onSaveToggle(recipe.id, false);
      } else {
        await saveRecipeToLibrary(recipe.id);
        onSaveToggle(recipe.id, true);
      }
    });
  }

  function handleLog() {
    if (!recipe) return;
    startTransition(async () => {
      await logRecipeMeal(recipe.id, mealType, date);
      setLogged(true);
      onLogged();
      setTimeout(() => setLogged(false), 2000);
    });
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients as string[]
    : [];

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions as string[]
    : [];

  const substitutions = Array.isArray(recipe.substitutions)
    ? recipe.substitutions
    : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-bark-400/40 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg
            z-50 bg-parchment-50 rounded-2xl shadow-warm-xl overflow-hidden flex flex-col animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-4 border-b border-parchment-200">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-2xs font-medium text-sage-300 uppercase tracking-wide mb-1">
                {MEAL_LABEL[mealType] ?? mealType}
              </p>
              <Dialog.Title className="font-display text-lg font-bold text-bark-300 leading-snug">
                {recipe.title}
              </Dialog.Title>
            </div>
            <Dialog.Close className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-parchment-200 hover:text-bark-300 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick stats */}
            <div className="p-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                {recipe.prep_time_min != null && (
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">{recipe.prep_time_min} мин</span>
                  </div>
                )}
                {recipe.dietary_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.dietary_tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-2xs rounded-full bg-sage-50 text-sage-400 border border-sage-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Macros grid */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <MacroChip label="Ккал" value={recipe.calories_per_serving} unit="" color="bg-amber-50" />
                <MacroChip label="Белок" value={recipe.protein_per_serving} unit="г" color="bg-vital-50" />
                <MacroChip label="Углев" value={recipe.carbs_per_serving} unit="г" color="bg-parchment-100" />
                <MacroChip label="Жиры" value={recipe.fat_per_serving} unit="г" color="bg-parchment-100" />
              </div>

              {/* Per 100g */}
              {recipe.calories_per_100g != null && (
                <p className="text-2xs text-stone-400 mb-5">
                  На 100г: {Math.round(recipe.calories_per_100g)} ккал · Б {Math.round(recipe.protein_per_100g ?? 0)}г · У {Math.round(recipe.carbs_per_100g ?? 0)}г · Ж {Math.round(recipe.fat_per_100g ?? 0)}г
                </p>
              )}

              {/* Ingredients */}
              {ingredients.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-2">Ингредиенты</h3>
                  <ul className="space-y-1.5">
                    {ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-500">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage-300 shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {instructions.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-2">Приготовление</h3>
                  <ol className="space-y-2.5">
                    {instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-stone-500">
                        <span className="shrink-0 h-5 w-5 rounded-full bg-bark-300 text-primary-foreground text-2xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Substitutions */}
              {substitutions.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-2">Замены</h3>
                  <div className="space-y-2">
                    {substitutions.map((sub, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-parchment-100 text-sm">
                        <Repeat2 className="h-3.5 w-3.5 text-sage-300 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-bark-200">{sub.original}</span>
                          <span className="text-stone-400 mx-1">→</span>
                          <span className="font-medium text-sage-400">{sub.substitute}</span>
                          {sub.reason && (
                            <p className="text-2xs text-stone-400 mt-0.5">{sub.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action footer */}
          <div className="p-4 pt-3 border-t border-parchment-200 flex gap-2">
            <button
              onClick={handleSaveToggle}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${isSaved
                  ? "bg-sage-50 text-sage-400 border border-sage-200 hover:bg-sage-100"
                  : "bg-parchment-100 text-stone-500 border border-parchment-200 hover:bg-parchment-200"
                }`}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? "Сохранено" : "В библиотеку"}
            </button>

            <button
              onClick={handleLog}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${logged
                  ? "bg-vital-300 text-white"
                  : "bg-bark-300 text-primary-foreground hover:bg-bark-400"
                }`}
            >
              {logged ? (
                <><CheckCheck className="h-4 w-4" /> Добавлено в дневник</>
              ) : (
                <>
                  <Flame className="h-4 w-4" />
                  Добавить в дневник
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Re-export icons used by parent
export { Flame, Beef, Wheat, Droplets };
