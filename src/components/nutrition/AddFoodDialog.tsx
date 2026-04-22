"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, useTransition, useCallback } from "react";
import { addFoodEntries, type FoodEntryData } from "@/app/dashboard/log/actions";
import { cn } from "@/lib/utils";
import type { FoodPhotoItem, FoodPhotoResult, WeekRecipeContext } from "@/lib/gigachat/client";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snacks: "Перекусы",
};

interface AddFoodDialogProps {
  date: string;
  defaultMeal: string;
  children: React.ReactNode;
  onAdded?: () => void;
}

type PhotoState = "idle" | "uploading" | "done" | "error";

interface CustomIngredient {
  id: number;
  name: string;
  weightInput: string;
  loading: boolean;
  resolved: FoodPhotoItem | null;
  error: string | null;
}

/** Sum nutrient fields across an array of FoodPhotoItems */
function sumItems(items: FoodPhotoItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein_g: acc.protein_g + (item.protein_g || 0),
      carbs_g: acc.carbs_g + (item.carbs_g || 0),
      fat_g: acc.fat_g + (item.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

let customIdCounter = 0;

export function AddFoodDialog({ date, defaultMeal, children, onAdded }: AddFoodDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [photoState, setPhotoState] = useState<PhotoState>("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<FoodPhotoResult | null>(null);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [customIngredients, setCustomIngredients] = useState<CustomIngredient[]>([]);

  // Manual entry mode (no photo)
  const [manualFood, setManualFood] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualP, setManualP] = useState("");
  const [manualC, setManualC] = useState("");
  const [manualF, setManualF] = useState("");

  function resetState() {
    setPhotoState("idle");
    setPhotoUrl(null);
    setPhotoResult(null);
    setCheckedIndices(new Set());
    setCustomIngredients([]);
    setError(null);
    setManualFood("");
    setManualCal("");
    setManualP("");
    setManualC("");
    setManualF("");
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) resetState();
  }

  /** Fetch current week's recipes for recipe-matching context */
  async function fetchWeekRecipes(): Promise<WeekRecipeContext[]> {
    try {
      const res = await fetch("/api/ai/meal-plan/get");
      if (!res.ok) return [];
      const data = await res.json() as {
        plan: { slots: Record<string, Record<string, { recipe_id: string }>> } | null;
        recipes: Record<string, {
          id: string; title: string;
          calories_per_serving: number | null;
          protein_per_serving: number | null;
          carbs_per_serving: number | null;
          fat_per_serving: number | null;
          ingredients: string[];
        }>;
      };
      if (!data.plan || !data.recipes) return [];
      return Object.values(data.recipes).map((r) => ({
        id: r.id,
        title: r.title,
        calories: r.calories_per_serving ?? 0,
        protein_g: r.protein_per_serving ?? 0,
        carbs_g: r.carbs_per_serving ?? 0,
        fat_g: r.fat_per_serving ?? 0,
        ingredients: r.ingredients ?? [],
      }));
    } catch {
      return [];
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoState("uploading");
    setError(null);
    setPhotoResult(null);
    setCheckedIndices(new Set());
    setCustomIngredients([]);
    setPhotoUrl(URL.createObjectURL(file));

    const [fd, weekRecipes] = await Promise.all([
      Promise.resolve(new FormData()),
      fetchWeekRecipes(),
    ]);
    fd.append("photo", file);
    if (weekRecipes.length > 0) {
      fd.append("weekRecipes", JSON.stringify(weekRecipes));
    }

    try {
      const res = await fetch("/api/ai/food-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data = await res.json() as FoodPhotoResult;
      if (data.error || !data.items?.length) {
        setPhotoState("error");
        setError(data.error ?? "Не удалось распознать еду на фото.");
        return;
      }
      setPhotoResult(data);
      // Auto-check all items
      setCheckedIndices(new Set(data.items.map((_, i) => i)));
      setPhotoState("done");
    } catch (err) {
      setPhotoState("error");
      setError(err instanceof Error ? err.message : "Ошибка анализа фото.");
    }
  }

  function toggleCheck(i: number) {
    setCheckedIndices((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function addCustomRow() {
    setCustomIngredients((prev) => [
      ...prev,
      { id: ++customIdCounter, name: "", weightInput: "", loading: false, resolved: null, error: null },
    ]);
  }

  function removeCustomRow(id: number) {
    setCustomIngredients((prev) => prev.filter((r) => r.id !== id));
  }

  function updateCustomField(id: number, field: "name" | "weightInput", value: string) {
    setCustomIngredients((prev) =>
      prev.map((r) => r.id === id ? { ...r, [field]: value, resolved: null, error: null } : r)
    );
  }

  const estimateCustom = useCallback(async (id: number) => {
    const row = customIngredients.find((r) => r.id === id);
    if (!row || !row.name.trim()) return;

    setCustomIngredients((prev) =>
      prev.map((r) => r.id === id ? { ...r, loading: true, resolved: null, error: null } : r)
    );

    try {
      const weight = parseFloat(row.weightInput);
      const res = await fetch("/api/ai/food-photo/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient: row.name.trim(),
          weight_g: isNaN(weight) ? undefined : weight,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as FoodPhotoItem;
      setCustomIngredients((prev) =>
        prev.map((r) => r.id === id ? { ...r, loading: false, resolved: data } : r)
      );
    } catch (err) {
      setCustomIngredients((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, loading: false, error: err instanceof Error ? err.message : "Ошибка" } : r
        )
      );
    }
  }, [customIngredients]);

  // Compute totals: checked photo items + resolved custom ingredients
  const checkedItems = (photoResult?.items ?? []).filter((_, i) => checkedIndices.has(i));
  const resolvedCustom = customIngredients.map((r) => r.resolved).filter(Boolean) as FoodPhotoItem[];
  const allItems = [...checkedItems, ...resolvedCustom];
  const totals = sumItems(allItems);

  const matchedRecipeId = photoResult?.matched_recipe_id;
  const confidence = photoResult?.recognition_confidence;
  const apology = photoResult?.apology;
  const hasPhotoItems = (photoResult?.items?.length ?? 0) > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Build entries to log
    let entries: FoodEntryData[];

    if (hasPhotoItems) {
      // Log each checked photo item + resolved custom as separate entries
      entries = allItems.map((item) => ({
        food_name: item.food_name,
        calories: Math.round(item.calories || 0),
        protein_g: Math.round((item.protein_g || 0) * 10) / 10,
        carbs_g: Math.round((item.carbs_g || 0) * 10) / 10,
        fat_g: Math.round((item.fat_g || 0) * 10) / 10,
        meal_type: defaultMeal,
        logged_date: date,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      }));

      if (!entries.length) {
        setError("Выберите хотя бы один ингредиент или добавьте свой.");
        return;
      }
    } else {
      // Manual entry
      if (!manualFood.trim()) {
        setError("Введите название блюда.");
        return;
      }
      entries = [{
        food_name: manualFood.trim(),
        calories: Number(manualCal) || 0,
        protein_g: Number(manualP) || 0,
        carbs_g: Number(manualC) || 0,
        fat_g: Number(manualF) || 0,
        meal_type: defaultMeal,
        logged_date: date,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      }];
    }

    startTransition(async () => {
      try {
        await addFoodEntries(entries);
        formRef.current?.reset();
        handleOpen(false);
        onAdded?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить запись.");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bark-500/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-parchment-50 border border-parchment-200 p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="font-display text-lg font-semibold text-bark-300 mb-1">
            Добавить в {MEAL_LABELS[defaultMeal] ?? defaultMeal}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Сфотографируйте блюдо для мгновенного анализа или введите данные вручную.
          </Dialog.Description>

          {/* Photo upload */}
          <div className="mb-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="sr-only"
              onChange={handlePhotoChange}
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoState === "uploading"}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-colors",
                photoState === "uploading"
                  ? "border-parchment-200 text-muted-foreground cursor-wait"
                  : "border-parchment-200 text-bark-200 hover:border-bark-100 hover:text-bark-300"
              )}
            >
              <CameraIcon className="h-4 w-4 shrink-0" />
              {photoState === "uploading" ? "Анализируем фото…" : "Анализировать фото через ИИ"}
            </button>

            {/* Photo preview + results */}
            {photoUrl && photoState !== "uploading" && (
              <div className="mt-3 space-y-3">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Предпросмотр"
                  className="h-20 w-full rounded-lg object-cover border border-parchment-200"
                />

                {/* Recipe match banner */}
                {matchedRecipeId && (
                  <div className="flex items-center gap-2 rounded-lg bg-sage-50 border border-sage-200 px-3 py-2 text-xs text-sage-700">
                    <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-sage-500" />
                    Блюдо совпадает с рецептом из плана питания — используются точные данные.
                  </div>
                )}

                {/* Confidence / apology */}
                {apology && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    <span className="font-medium">ИИ: </span>{apology} Проверьте данные перед сохранением.
                  </div>
                )}
                {!apology && confidence === "medium" && (
                  <p className="text-xs text-muted-foreground">
                    Уверенность распознавания: средняя. Данные приблизительные.
                  </p>
                )}

                {/* Ingredient checklist */}
                {photoState === "done" && hasPhotoItems && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-bark-200">
                      Распознанные ингредиенты — снимите галочку, если что-то лишнее:
                    </p>
                    {photoResult!.items.map((item, i) => (
                      <label
                        key={i}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors",
                          checkedIndices.has(i)
                            ? "border-bark-100 bg-parchment-100"
                            : "border-parchment-200 bg-white opacity-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checkedIndices.has(i)}
                          onChange={() => toggleCheck(i)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-bark-300"
                        />
                        <span className="flex-1">
                          <span className="font-medium text-bark-300">{item.food_name}</span>
                          <span className="ml-1.5 text-muted-foreground">
                            {item.portion}{item.weight_g ? ` · ~${item.weight_g}г` : ""}
                          </span>
                          <span className="ml-1.5 text-bark-200">
                            {Math.round(item.calories)} ккал · Б{item.protein_g.toFixed(1)} Ж{item.fat_g.toFixed(1)} У{item.carbs_g.toFixed(1)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Manual entry (shown when no photo items) */}
            {!hasPhotoItems && (
              <>
                <div>
                  <label className="block text-xs font-medium text-bark-200 mb-1">
                    Название блюда
                  </label>
                  <input
                    type="text"
                    value={manualFood}
                    onChange={(e) => setManualFood(e.target.value)}
                    placeholder="Напр. Куриная грудка на гриле"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bark-200 mb-1">
                    Калории (ккал)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualCal}
                    onChange={(e) => setManualCal(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Белки (г)", val: manualP, set: setManualP },
                    { label: "Углеводы (г)", val: manualC, set: setManualC },
                    { label: "Жиры (г)", val: manualF, set: setManualF },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-bark-200 mb-1">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        placeholder="0"
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Custom ingredient rows */}
            {customIngredients.map((row) => (
              <div key={row.id} className="rounded-lg border border-parchment-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-bark-200">Свой ингредиент</span>
                  <button
                    type="button"
                    onClick={() => removeCustomRow(row.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Удалить
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Название (напр. творог)"
                    value={row.name}
                    onChange={(e) => updateCustomField(row.id, "name", e.target.value)}
                    className={cn(inputCls, "flex-1")}
                  />
                  <input
                    type="number"
                    placeholder="Вес (г)"
                    min="1"
                    step="1"
                    value={row.weightInput}
                    onChange={(e) => updateCustomField(row.id, "weightInput", e.target.value)}
                    className={cn(inputCls, "w-24")}
                  />
                  <button
                    type="button"
                    disabled={!row.name.trim() || row.loading}
                    onClick={() => estimateCustom(row.id)}
                    className="rounded-lg bg-parchment-200 px-3 py-2 text-xs font-medium text-bark-300 hover:bg-parchment-300 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {row.loading ? "…" : "Считать"}
                  </button>
                </div>
                {row.resolved && (
                  <div className="text-xs text-sage-600 bg-sage-50 rounded px-2 py-1">
                    {row.resolved.food_name}: {Math.round(row.resolved.calories)} ккал
                    · Б{row.resolved.protein_g.toFixed(1)} Ж{row.resolved.fat_g.toFixed(1)} У{row.resolved.carbs_g.toFixed(1)}
                    {row.resolved.weight_was_estimated && (
                      <span className="ml-1 text-amber-600">(вес оценён ~{row.resolved.weight_g}г)</span>
                    )}
                  </div>
                )}
                {row.error && <p className="text-xs text-destructive">{row.error}</p>}
              </div>
            ))}

            {/* Add custom ingredient button (available when photo items exist) */}
            {hasPhotoItems && (
              <button
                type="button"
                onClick={addCustomRow}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-parchment-200 py-2 text-xs text-bark-200 hover:border-bark-100 hover:text-bark-300 transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Добавить свой ингредиент
              </button>
            )}

            {/* Totals summary */}
            {allItems.length > 0 && (
              <div className="rounded-lg bg-bark-300 text-primary-foreground px-4 py-3 text-sm">
                <div className="font-medium mb-1">
                  Итого: {Math.round(totals.calories)} ккал
                  {allItems.length > 1 && <span className="text-xs opacity-70 ml-1">({allItems.length} поз.)</span>}
                </div>
                <div className="text-xs opacity-80 flex gap-3">
                  <span>Б: {totals.protein_g.toFixed(1)}г</span>
                  <span>Ж: {totals.fat_g.toFixed(1)}г</span>
                  <span>У: {totals.carbs_g.toFixed(1)}г</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className={secondaryBtnCls} disabled={isPending}>
                  Отмена
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className={primaryBtnCls}
                disabled={isPending || photoState === "uploading"}
              >
                {isPending ? "Сохраняем…" : "Добавить"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputCls =
  "w-full rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm text-bark-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const primaryBtnCls =
  "rounded-lg bg-bark-300 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-bark-400 disabled:opacity-50 transition-colors";

const secondaryBtnCls =
  "rounded-lg border border-parchment-200 bg-transparent px-4 py-2 text-sm font-medium text-bark-200 hover:bg-parchment-200 disabled:opacity-50 transition-colors";

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
