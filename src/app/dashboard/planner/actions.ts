"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface RecipeSummary {
  id: string;
  title: string;
  prep_time_min: number | null;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  ingredients: string[];
  instructions: string[];
  dietary_tags: string[];
  stores: string[];
  substitutions: Array<{ original: string; substitute: string; reason: string }>;
}

export interface MealSlot {
  recipe_id: string;
  pinned: boolean;
  days_span?: number; // Number of days this meal covers (default: 1)
}

export interface MealPlan {
  id: string;
  week_start_date: string;
  slots: Record<string, Record<string, MealSlot>>;
  training_schedule: Record<string, string>; // date → "зал" | "отдых"
}

export interface MealCompletion {
  slot_date: string;
  meal_type: string;
}

/** Derive Monday of a given date's week. */
function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Fetch the meal plan for a given week, along with all recipes and completions. */
export async function getMealPlan(weekStart?: string): Promise<{
  plan: MealPlan | null;
  recipes: Record<string, RecipeSummary>;
  savedRecipeIds: string[];
  completions: MealCompletion[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { plan: null, recipes: {}, savedRecipeIds: [], completions: [] };

  const ws = getWeekStart(weekStart);

  const [planResult, savedResult] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("id, week_start_date, slots, training_schedule")
      .eq("user_id", user.id)
      .eq("week_start_date", ws)
      .maybeSingle(),
    supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", user.id),
  ]);

  const savedRecipeIds = (savedResult.data ?? []).map((r) => r.recipe_id);

  if (!planResult.data) return { plan: null, recipes: {}, savedRecipeIds, completions: [] };

  const plan = planResult.data as MealPlan;
  if (!plan.training_schedule) plan.training_schedule = {};

  // Fetch completions for this plan
  const { data: completionsData } = await supabase
    .from("meal_completions")
    .select("slot_date, meal_type")
    .eq("meal_plan_id", plan.id)
    .eq("user_id", user.id);

  const completions: MealCompletion[] = (completionsData ?? []).map((c) => ({
    slot_date: c.slot_date,
    meal_type: c.meal_type,
  }));

  // Collect all recipe IDs from slots
  const recipeIds = new Set<string>();
  for (const daySlots of Object.values(plan.slots)) {
    for (const slot of Object.values(daySlots)) {
      if (slot?.recipe_id) recipeIds.add(slot.recipe_id);
    }
  }

  if (recipeIds.size === 0) return { plan, recipes: {}, savedRecipeIds, completions };

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, prep_time_min, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, ingredients, instructions, dietary_tags, stores, substitutions")
    .in("id", [...recipeIds]);

  const recipesMap = Object.fromEntries((recipes ?? []).map((r) => [r.id, r as RecipeSummary]));

  return { plan, recipes: recipesMap, savedRecipeIds, completions };
}

/** Toggle a meal slot completion (check-off). */
export async function toggleMealCompletion(
  planId: string,
  date: string,
  mealType: string
): Promise<{ success: boolean; nowCompleted: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, nowCompleted: false };

  // Check if completion exists
  const { data: existing } = await supabase
    .from("meal_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("meal_plan_id", planId)
    .eq("slot_date", date)
    .eq("meal_type", mealType)
    .maybeSingle();

  if (existing) {
    // Remove completion
    const { error } = await supabase
      .from("meal_completions")
      .delete()
      .eq("id", existing.id);
    revalidatePath("/dashboard/planner");
    return { success: !error, nowCompleted: false };
  } else {
    // Add completion
    const { error } = await supabase
      .from("meal_completions")
      .insert({ user_id: user.id, meal_plan_id: planId, slot_date: date, meal_type: mealType });
    revalidatePath("/dashboard/planner");
    return { success: !error, nowCompleted: true };
  }
}

/** Toggle pin/unpin for a specific slot. */
export async function togglePinSlot(
  planId: string,
  date: string,
  mealType: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("slots")
    .eq("id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!plan) return { success: false };

  const slots = plan.slots as Record<string, Record<string, MealSlot>>;
  const slot = slots[date]?.[mealType];
  if (!slot) return { success: false };

  slots[date][mealType] = { ...slot, pinned: !slot.pinned };

  const admin = createAdminClient();
  const { error } = await admin.from("meal_plans").update({ slots }).eq("id", planId);

  revalidatePath("/dashboard/planner");
  return { success: !error };
}

/** Set the days span for a batch meal. */
export async function setMealBatchSpan(
  planId: string,
  date: string,
  mealType: string,
  daysSpan: number
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("slots")
    .eq("id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!plan) return { success: false };

  const slots = plan.slots as Record<string, Record<string, MealSlot>>;
  const slot = slots[date]?.[mealType];
  if (!slot) return { success: false };

  slots[date][mealType] = { ...slot, days_span: Math.max(1, Math.min(7, daysSpan)) };

  const admin = createAdminClient();
  const { error } = await admin.from("meal_plans").update({ slots }).eq("id", planId);

  revalidatePath("/dashboard/planner");
  return { success: !error };
}

/** Save a recipe to the user's library. */
export async function saveRecipeToLibrary(recipeId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("saved_recipes")
    .upsert({ user_id: user.id, recipe_id: recipeId }, { onConflict: "user_id,recipe_id" });

  revalidatePath("/dashboard/recipes");
  return { success: !error };
}

/** Remove a recipe from the user's library. */
export async function unsaveRecipe(recipeId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);

  revalidatePath("/dashboard/recipes");
  return { success: !error };
}

/** Set or update the plan start date for catalog-week anchoring (TES-103). */
export async function setPlanStartDate(date: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("user_plan_config")
    .upsert({ user_id: user.id, plan_start_date: date }, { onConflict: "user_id" });

  revalidatePath("/dashboard/planner");
  revalidatePath("/dashboard/recipes");
  return { success: !error };
}

/** Log a recipe as a meal entry in nutrition_logs. */
export async function logRecipeMeal(
  recipeId: string,
  mealType: string,
  date: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving")
    .eq("id", recipeId)
    .single();

  if (!recipe) return { success: false };

  const { error } = await supabase.from("nutrition_logs").insert({
    user_id: user.id,
    logged_date: date,
    meal_type: mealType,
    food_name: recipe.title,
    calories: recipe.calories_per_serving ?? 0,
    protein_g: recipe.protein_per_serving ?? 0,
    carbs_g: recipe.carbs_per_serving ?? 0,
    fat_g: recipe.fat_per_serving ?? 0,
  });

  revalidatePath("/dashboard/log");
  return { success: !error };
}
