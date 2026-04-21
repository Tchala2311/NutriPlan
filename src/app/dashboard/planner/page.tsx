import type { Metadata } from "next";
import { isPremium } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

export const metadata: Metadata = { title: "Планировщик питания — NutriPlan" };

export default async function MealPlannerPage() {
  const premium = await isPremium();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Планировщик питания</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Планируйте приёмы пищи на неделю вперёд.
        </p>
      </div>

      {!premium ? (
        <UpgradePrompt
          feature="Планировщик питания"
          description="Составляйте меню на неделю вперёд с умными подсказками на основе ваших целей по нутриентам."
        />
      ) : (
        <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
          <CalendarIcon className="mx-auto h-10 w-10 text-parchment-300 mb-3" />
          <p className="font-display text-lg font-semibold text-bark-200">Скоро</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            Недельное планирование питания с умными подсказками уже в разработке.
          </p>
        </div>
      )}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
