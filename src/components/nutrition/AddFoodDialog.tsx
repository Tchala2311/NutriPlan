"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, useTransition } from "react";
import { addFoodEntry } from "@/app/dashboard/log/actions";
import { cn } from "@/lib/utils";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

interface AddFoodDialogProps {
  date: string;
  defaultMeal: string;
  children: React.ReactNode;
}

export function AddFoodDialog({ date, defaultMeal, children }: AddFoodDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addFoodEntry(fd);
        formRef.current?.reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save entry.");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bark-500/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-parchment-50 border border-parchment-200 p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="font-display text-lg font-semibold text-bark-300 mb-1">
            Add food to {MEAL_LABELS[defaultMeal] ?? defaultMeal}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Enter nutrition details for this food item.
          </Dialog.Description>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="logged_date" value={date} />
            <input type="hidden" name="meal_type" value={defaultMeal} />

            <div>
              <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="food_name">
                Food name
              </label>
              <input
                id="food_name"
                name="food_name"
                type="text"
                required
                placeholder="e.g. Grilled chicken breast"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="calories">
                Calories (kcal)
              </label>
              <input
                id="calories"
                name="calories"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="protein_g">
                  Protein (g)
                </label>
                <input
                  id="protein_g"
                  name="protein_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="carbs_g">
                  Carbs (g)
                </label>
                <input
                  id="carbs_g"
                  name="carbs_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bark-200 mb-1" htmlFor="fat_g">
                  Fat (g)
                </label>
                <input
                  id="fat_g"
                  name="fat_g"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className={secondaryBtnCls} disabled={isPending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className={primaryBtnCls} disabled={isPending}>
                {isPending ? "Saving…" : "Add entry"}
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
