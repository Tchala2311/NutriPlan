import type { Metadata } from "next";
import { isPremium } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { createClient } from "@/lib/supabase/server";
import { getMealPlan } from "@/app/dashboard/planner/actions";
import type { RecipeSummary } from "@/app/dashboard/planner/actions";
import { RecipesClient } from "@/components/planner/RecipesClient";

/** Compute catalog week (1–8) from plan_start_date. */
function computeCatalogWeek(planStartDate: string): number {
  const start = new Date(planStartDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysElapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const week = Math.floor(daysElapsed / 7) + 1;
  return Math.min(Math.max(week, 1), 8);
}

export const metadata: Metadata = { title: "Рецепты — NutriPlan" };

export default async function RecipesPage() {
  const premium = await isPremium();

  if (!premium) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bark-300">Рецепты</h1>
          <p className="mt-1 text-sm text-muted-foreground">Рецепты, подобранные под ваши цели.</p>
        </div>
        <UpgradePrompt
          feature="База рецептов"
          description="Получите доступ к персональным рецептам с полным расчётом КБЖУ, подобранным под ваши цели."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [mealPlanData, savedResult] = await Promise.all([
    getMealPlan(),
    user
      ? supabase
          .from("saved_recipes")
          .select(
            "saved_at, recipe:recipe_id(id, title, prep_time_min, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, ingredients, instructions, dietary_tags, substitutions)"
          )
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Unique recipes from this week's AI plan, preserving insertion order
  let weeklyRecipes: RecipeSummary[] = Object.values(mealPlanData.recipes);
  let isCatalogSource = false;
  let catalogWeekLabel: string | undefined;

  // Fallback: if AI plan has no recipes, show catalog meals for the current week (TES-103)
  if (weeklyRecipes.length === 0 && user) {
    const configResult = await supabase
      .from("user_plan_config")
      .select("plan_start_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const planStartDate = configResult.data?.plan_start_date as string | null | undefined;

    if (planStartDate) {
      const catalogWeek = computeCatalogWeek(planStartDate);
      catalogWeekLabel = `Неделя ${catalogWeek} каталога`;

      const { data: catalogMeals } = await supabase
        .from("meals")
        .select("id, name, kcal, protein_g, carbs_g, fat_g")
        .eq("week", catalogWeek)
        .order("day")
        .order("meal_type");

      if (catalogMeals && catalogMeals.length > 0) {
        // Deduplicate by name (same dish appears across multiple days)
        const seen = new Set<string>();
        weeklyRecipes = catalogMeals
          .filter((m) => {
            if (seen.has(m.name)) return false;
            seen.add(m.name);
            return true;
          })
          .map((m) => ({
            id: m.id as string,
            title: m.name as string,
            prep_time_min: null,
            calories_per_serving: m.kcal as number | null,
            protein_per_serving: m.protein_g as number | null,
            carbs_per_serving: m.carbs_g as number | null,
            fat_per_serving: m.fat_g as number | null,
            calories_per_100g: null,
            protein_per_100g: null,
            carbs_per_100g: null,
            fat_per_100g: null,
            ingredients: [],
            instructions: [],
            dietary_tags: [],
            stores: [],
            substitutions: [],
          }));
        isCatalogSource = true;
      }
    }
  }

  const savedRecipes = ((savedResult.data ?? []) as Array<{ saved_at: string; recipe: unknown }>)
    .filter((r) => r.recipe)
    .map((r) => ({
      recipe: r.recipe as RecipeSummary,
      saved_at: r.saved_at,
    }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Рецепты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Рецепты текущей недели и ваша библиотека избранного.
        </p>
      </div>
      <RecipesClient
        weeklyRecipes={weeklyRecipes}
        initialSavedRecipeIds={mealPlanData.savedRecipeIds}
        savedRecipes={savedRecipes}
        isCatalogSource={isCatalogSource}
        catalogWeekLabel={catalogWeekLabel}
      />
    </div>
  );
}
