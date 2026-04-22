import type { Metadata } from "next";
import { isPremium } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { createClient } from "@/lib/supabase/server";
import {
  MultiPhasePlannerClient,
  type CatalogMeal,
  type ShoppingItem,
  type UserPlanConfig,
  type UserGoalContext,
} from "@/components/planner/MultiPhasePlannerClient";

export const metadata: Metadata = { title: "Планировщик питания — NutriPlan" };

export default async function MealPlannerPage() {
  const premium = await isPremium();

  if (!premium) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bark-300">Планировщик питания</h1>
          <p className="mt-1 text-sm text-muted-foreground">8-недельная программа питания с учётом тренировок.</p>
        </div>
        <UpgradePrompt
          feature="Планировщик питания"
          description="Получите 8-недельный план питания с фазами, списком покупок и трекером приёмов пищи."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Load week 1 (Phase 1, Week 1) as initial data
  const [mealsResult, completionsResult, shoppingResult, configResult, haResult] = await Promise.all([
    supabase
      .from("meals")
      .select("id, day, meal_type, name, description, kcal, protein_g, carbs_g, fat_g, is_batch")
      .eq("week", 1)
      .order("day")
      .order("meal_type"),
    supabase
      .from("catalog_completions")
      .select("day, meal_type")
      .eq("user_id", user.id)
      .eq("week", 1),
    supabase
      .from("shopping_items")
      .select("category, category_order, item_name, quantity_per_person, shopping_window")
      .eq("week", 1)
      .order("category_order")
      .order("item_name"),
    supabase
      .from("user_plan_config")
      .select("tdee_kcal, reference_tdee")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("health_assessments")
      .select("primary_goal, secondary_goals, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, eating_disorder_flag")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const initialMeals: CatalogMeal[] = (mealsResult.data ?? []) as CatalogMeal[];
  const initialCompletions: string[] = (completionsResult.data ?? []).map(
    (c) => `${c.day}-${c.meal_type}`
  );
  const initialShopping: ShoppingItem[] = (shoppingResult.data ?? []) as ShoppingItem[];
  const initialConfig: UserPlanConfig | null = configResult.data ?? null;

  const ha = haResult.data;
  const goalContext: UserGoalContext = {
    primaryGoal: ha?.primary_goal ?? "general_wellness",
    secondaryGoals: ha?.secondary_goals ?? [],
    dietaryRestrictions: ha?.dietary_restrictions ?? [],
    allergens: ha?.allergens ?? [],
    avoidedIngredients: ha?.avoided_ingredients ?? [],
    medicalConditions: ha?.medical_conditions ?? [],
    eatingDisorderFlag: ha?.eating_disorder_flag ?? false,
  };

  return (
    <MultiPhasePlannerClient
      initialMeals={initialMeals}
      initialCompletions={initialCompletions}
      initialConfig={initialConfig}
      initialShopping={initialShopping}
      goalContext={goalContext}
    />
  );
}
