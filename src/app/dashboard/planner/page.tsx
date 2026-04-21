import type { Metadata } from "next";
import { isPremium } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { getMealPlan } from "./actions";
import { MealPlannerClient } from "@/components/planner/MealPlannerClient";

export const metadata: Metadata = { title: "Планировщик питания — NutriPlan" };

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function MealPlannerPage() {
  const premium = await isPremium();

  if (!premium) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bark-300">Планировщик питания</h1>
          <p className="mt-1 text-sm text-muted-foreground">Планируйте приёмы пищи на 4 недели вперёд.</p>
        </div>
        <UpgradePrompt
          feature="Планировщик питания"
          description="Составляйте меню на 4 недели вперёд с ИИ-рецептами, списком покупок и трекером приёмов пищи."
        />
      </div>
    );
  }

  const weekStart = getWeekStart();
  const { plan, recipes, savedRecipeIds, completions } = await getMealPlan(weekStart);

  return (
    <MealPlannerClient
      initialPlan={plan}
      initialRecipes={recipes}
      initialSavedIds={savedRecipeIds}
      initialCompletions={completions}
      weekStart={weekStart}
    />
  );
}
