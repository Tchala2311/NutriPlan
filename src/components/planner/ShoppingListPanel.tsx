"use client";

import { useState, useMemo } from "react";
import { ShoppingCart, Minus, Plus, Store } from "lucide-react";
import type { RecipeSummary } from "@/app/dashboard/planner/actions";

type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

interface ShoppingListPanelProps {
  weekRecipes: Array<{ recipe: RecipeSummary; mealType: MealType; date: string }>;
  planGroupStart: string;
  activeWeekOffset: number;
}

const STORES = [
  { key: "all", label: "Все" },
  { key: "vkusvill", label: "ВкусВилл" },
  { key: "perekrestok", label: "Перекрёсток" },
  { key: "ozon", label: "Озон" },
  { key: "rynok", label: "Рынок" },
  { key: "azbuka", label: "Азбука Вкуса" },
  { key: "none", label: "Без магазина" },
] as const;

type StoreKey = (typeof STORES)[number]["key"];

// Day range options: 3 days, 5 days, full week
const RANGE_OPTIONS = [
  { label: "Дни 1–3", days: 3 },
  { label: "Дни 1–5", days: 5 },
  { label: "Вся неделя", days: 7 },
];

export function ShoppingListPanel({ weekRecipes }: ShoppingListPanelProps) {
  const [activeStore, setActiveStore] = useState<StoreKey>("all");
  const [portions, setPortions] = useState(1);
  const [rangeDays, setRangeDays] = useState(7);

  // Get unique dates from weekRecipes (sorted)
  const allDates = useMemo(() => {
    const s = new Set(weekRecipes.map((r) => r.date));
    return [...s].sort();
  }, [weekRecipes]);

  // Filtered by date range
  const filteredRecipes = useMemo(() => {
    const cutoff = allDates[rangeDays - 1];
    return weekRecipes.filter((r) => !cutoff || r.date <= cutoff);
  }, [weekRecipes, allDates, rangeDays]);

  // Aggregate ingredients from filtered recipes, applying store filter
  const shoppingItems = useMemo(() => {
    const items: Map<string, { ingredient: string; count: number; stores: string[] }> = new Map();

    for (const { recipe } of filteredRecipes) {
      const recipeStores = recipe.stores ?? [];
      // Skip if store filter active and recipe doesn't match
      if (activeStore !== "all" && recipeStores.length > 0 && !recipeStores.includes(activeStore)) {
        continue;
      }
      // Assign "none" if no stores tagged and filter is "none"
      if (activeStore === "none" && recipeStores.length > 0) continue;

      for (const ingredient of recipe.ingredients ?? []) {
        const key = ingredient.toLowerCase().trim();
        if (items.has(key)) {
          items.get(key)!.count += 1;
        } else {
          items.set(key, { ingredient, count: 1, stores: recipeStores });
        }
      }
    }

    return [...items.values()];
  }, [filteredRecipes, activeStore]);

  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggleChecked(ingredient: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) next.delete(ingredient); else next.add(ingredient);
      return next;
    });
  }

  const unchecked = shoppingItems.filter((i) => !checked.has(i.ingredient));
  const checkedItems = shoppingItems.filter((i) => checked.has(i.ingredient));

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date range */}
        <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rangeDays === opt.days
                  ? "bg-white shadow-warm-sm text-bark-300"
                  : "text-stone-400 hover:text-bark-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Portion scaling */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-stone-400">Порций:</span>
          <div className="flex items-center gap-1 bg-parchment-100 rounded-xl p-1">
            <button
              onClick={() => setPortions((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-parchment-200 transition-colors text-stone-400 hover:text-bark-300"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-semibold text-bark-300 min-w-[1.5rem] text-center">
              {portions}
            </span>
            <button
              onClick={() => setPortions((p) => Math.min(10, p + 1))}
              className="p-1.5 rounded-lg hover:bg-parchment-200 transition-colors text-stone-400 hover:text-bark-300"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {portions > 1 && (
            <span className="text-2xs text-stone-400">× {portions} = {portions} чел.</span>
          )}
        </div>
      </div>

      {/* Store filter tabs */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex items-center gap-1 min-w-max">
          {STORES.map((store) => (
            <button
              key={store.key}
              onClick={() => setActiveStore(store.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeStore === store.key
                  ? "bg-bark-300 text-primary-foreground"
                  : "bg-parchment-100 text-stone-400 hover:text-bark-300 hover:bg-parchment-200"
              }`}
            >
              {store.key !== "all" && store.key !== "none" && <Store className="h-3 w-3" />}
              {store.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping list */}
      {shoppingItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-parchment-300 mb-4" />
          <p className="text-sm text-muted-foreground">Список покупок пуст</p>
          <p className="mt-1 text-xs text-stone-400">Выберите другой магазин или диапазон дней</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>
              {unchecked.length} из {shoppingItems.length} продуктов
              {portions > 1 ? ` · ×${portions} порций` : ""}
            </span>
          </div>

          {/* Unchecked items */}
          {unchecked.length > 0 && (
            <div className="rounded-2xl border border-parchment-200 bg-white divide-y divide-parchment-100">
              {unchecked.map(({ ingredient, count, stores: itemStores }) => (
                <ShoppingItem
                  key={ingredient}
                  ingredient={ingredient}
                  count={count}
                  portions={portions}
                  stores={itemStores}
                  checked={false}
                  onToggle={() => toggleChecked(ingredient)}
                />
              ))}
            </div>
          )}

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 mb-2">Уже куплено</p>
              <div className="rounded-2xl border border-parchment-200 bg-white divide-y divide-parchment-100 opacity-60">
                {checkedItems.map(({ ingredient, count, stores: itemStores }) => (
                  <ShoppingItem
                    key={ingredient}
                    ingredient={ingredient}
                    count={count}
                    portions={portions}
                    stores={itemStores}
                    checked={true}
                    onToggle={() => toggleChecked(ingredient)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingItem({
  ingredient,
  count,
  portions,
  stores,
  checked,
  onToggle,
}: {
  ingredient: string;
  count: number;
  portions: number;
  stores: string[];
  checked: boolean;
  onToggle: () => void;
}) {
  // Try to scale quantity. Parse "200г" → "400г" for 2 portions etc.
  const scaledIngredient = useMemo(() => {
    if (portions === 1) return ingredient;
    return ingredient.replace(/(\d+(?:[.,]\d+)?)\s*(г|кг|мл|л|шт|ст\.л\.|ч\.л\.|стакан)/g, (_, num, unit) => {
      const scaled = Math.round(parseFloat(num.replace(",", ".")) * portions * count);
      return `${scaled} ${unit}`;
    });
  }, [ingredient, portions, count]);

  const storeLabels: Record<string, string> = {
    vkusvill: "ВкусВилл",
    perekrestok: "Перекрёсток",
    ozon: "Озон",
    rynok: "Рынок",
    azbuka: "Азбука",
  };

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-parchment-50 transition-colors"
    >
      <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
        checked ? "bg-sage-400 border-sage-400" : "border-parchment-300"
      }`}>
        {checked && (
          <svg viewBox="0 0 12 12" className="w-full h-full p-0.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </div>
      <span className={`flex-1 text-sm ${checked ? "line-through text-stone-400" : "text-bark-300"}`}>
        {scaledIngredient}
        {count > 1 && portions === 1 && (
          <span className="text-stone-400 ml-1">×{count}</span>
        )}
      </span>
      {stores.length > 0 && (
        <span className="text-2xs text-stone-400 flex-shrink-0">
          {stores.map((s) => storeLabels[s] ?? s).join(", ")}
        </span>
      )}
    </button>
  );
}
