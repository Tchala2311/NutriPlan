"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, useTransition } from "react";
import { addFoodEntry } from "@/app/dashboard/log/actions";
import { cn } from "@/lib/utils";
import type { FoodPhotoItem } from "@/lib/gigachat/client";

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

export function AddFoodDialog({ date, defaultMeal, children, onAdded }: AddFoodDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [photoState, setPhotoState] = useState<PhotoState>("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<FoodPhotoItem[]>([]);
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<number | null>(null);

  // Form field state (for AI prefill)
  const [prefill, setPrefill] = useState<Partial<FoodPhotoItem> | null>(null);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setPhotoState("idle");
      setPhotoUrl(null);
      setPhotoItems([]);
      setSelectedPhotoItem(null);
      setPrefill(null);
      setError(null);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoState("uploading");
    setError(null);
    setPhotoItems([]);
    setSelectedPhotoItem(null);
    setPrefill(null);

    // Preview URL
    setPhotoUrl(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("photo", file);

    try {
      const res = await fetch("/api/ai/food-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { items: FoodPhotoItem[]; error?: string };
      if (data.error || !data.items?.length) {
        setPhotoState("error");
        setError(data.error ?? "Не удалось распознать еду на фото.");
        return;
      }
      setPhotoItems(data.items);
      setPhotoState("done");
      // Auto-select first item if only one
      if (data.items.length === 1) {
        applyPhotoItem(data.items[0], 0);
      }
    } catch (err) {
      setPhotoState("error");
      setError(err instanceof Error ? err.message : "Ошибка анализа фото.");
    }
  }

  function applyPhotoItem(item: FoodPhotoItem, idx: number) {
    setSelectedPhotoItem(idx);
    setPrefill(item);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (photoUrl) fd.set("photo_url", photoUrl);
    startTransition(async () => {
      try {
        await addFoodEntry(fd);
        formRef.current?.reset();
        handleOpen(false);
        onAdded?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить запись.");
      }
    });
  }

  const pv = prefill ?? {};

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

          {/* Photo upload area */}
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

            {/* Photo preview thumbnail */}
            {photoUrl && photoState !== "uploading" && (
              <div className="mt-3 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Предпросмотр фото"
                  className="h-16 w-16 rounded-lg object-cover border border-parchment-200 shrink-0"
                />
                {photoState === "done" && photoItems.length > 1 && (
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-bark-200">Распознано — нажмите для заполнения:</p>
                    {photoItems.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyPhotoItem(item, i)}
                        className={cn(
                          "w-full text-left rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                          selectedPhotoItem === i
                            ? "border-bark-100 bg-bark-300 text-primary-foreground"
                            : "border-parchment-200 bg-white text-bark-300 hover:bg-parchment-100"
                        )}
                      >
                        <span className="font-medium">{item.food_name}</span>
                        <span className="ml-1.5 text-[10px] opacity-70">{item.calories} kcal · {item.portion}</span>
                      </button>
                    ))}
                  </div>
                )}
                {photoState === "done" && photoItems.length === 1 && (
                  <p className="text-xs text-sage-400 mt-1">
                    Распознано: <span className="font-medium text-bark-300">{photoItems[0].food_name}</span> — форма заполнена.
                  </p>
                )}
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="logged_date" value={date} />
            <input type="hidden" name="meal_type" value={defaultMeal} />

            <div>
              <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="food_name">
                Название блюда
              </label>
              <input
                id="food_name"
                name="food_name"
                type="text"
                required
                placeholder="Напр. Куриная грудка на гриле"
                defaultValue={pv.food_name ?? ""}
                key={`name-${selectedPhotoItem}`}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="calories">
                Калории (ккал)
              </label>
              <input
                id="calories"
                name="calories"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
                defaultValue={pv.calories ?? ""}
                key={`cal-${selectedPhotoItem}`}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="protein_g">
                  Белки (г)
                </label>
                <input
                  id="protein_g"
                  name="protein_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  defaultValue={pv.protein_g ?? ""}
                  key={`p-${selectedPhotoItem}`}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="carbs_g">
                  Углеводы (г)
                </label>
                <input
                  id="carbs_g"
                  name="carbs_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  defaultValue={pv.carbs_g ?? ""}
                  key={`c-${selectedPhotoItem}`}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="fat_g">
                  Жиры (г)
                </label>
                <input
                  id="fat_g"
                  name="fat_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  defaultValue={pv.fat_g ?? ""}
                  key={`f-${selectedPhotoItem}`}
                  className={inputCls}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className={secondaryBtnCls} disabled={isPending}>
                  Отмена
                </button>
              </Dialog.Close>
              <button type="submit" className={primaryBtnCls} disabled={isPending || photoState === "uploading"}>
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
