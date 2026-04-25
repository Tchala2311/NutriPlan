"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateWeeklyMealPlan, type UserProfile, type MealRecipeRaw } from "@/lib/gigachat/client";
import { getMealPlanPrompt, type MealPlanPromptParams } from "@/lib/planner/goal-prompts";
import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";
import { canAccessPremiumFeatures } from "@/lib/subscription";
import type { User } from "@supabase/supabase-js";

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

/** Derive Sunday of a given date's week. */
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

/** Get all 7 dates in a week. */
function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Compute per-100g values from per-serving + estimated weight. */
function per100g(value: number, estimatedWeightG: number): number {
  return Math.round((value / estimatedWeightG) * 100 * 10) / 10;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

function buildRecipeRow(meal: MealRecipeRaw, mealType: string, userId: string) {
  const weightEstimate = mealType === "snacks" ? 150 : 300;
  return {
    title: meal.title,
    ingredients: meal.ingredients,
    instructions: meal.steps,
    servings: 1,
    prep_time_min: meal.prep_min ?? null,
    calories_per_serving: meal.kcal ?? null,
    protein_per_serving: meal.p ?? null,
    carbs_per_serving: meal.c ?? null,
    fat_per_serving: meal.f ?? null,
    calories_per_100g: meal.kcal ? per100g(meal.kcal, weightEstimate) : null,
    protein_per_100g: meal.p ? per100g(meal.p, weightEstimate) : null,
    carbs_per_100g: meal.c ? per100g(meal.c, weightEstimate) : null,
    fat_per_100g: meal.f ? per100g(meal.f, weightEstimate) : null,
    dietary_tags: meal.tags ?? [],
    goal_tags: [],
    substitutions: meal.substitutions ?? [],
    source: "gigachat",
    created_by_user_id: userId,
  };
}

/** Regenerate meals via GigaChat for specific redo type. */
async function regenerateMealsForRedo(
  user: User,
  weekStart: string,
  redoType: "individual" | "daily" | "weekly",
  affectedDate: string,
  affectedMealType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Load user profile data for GigaChat prompt
  const [haRes, goalsRes, settingsRes, planRes] = await Promise.all([
    supabase
      .from("health_assessments")
      .select("primary_goal, secondary_goals, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, eating_disorder_flag, eating_disorder_anorexia_restrictive, eating_disorder_binge, eating_disorder_orthorexia, is_pregnant, pregnancy_trimester, is_breastfeeding")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_goals")
      .select("daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g, weight_kg, height_cm, age, sex, activity_level")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("budget_preference")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("meal_plans")
      .select("id, slots")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
  ]);

  const ha = haRes.data;
  const goals = goalsRes.data;
  const settings = settingsRes.data;
  const existingPlan = planRes.data;

  if (!existingPlan) {
    return { success: false, error: "No meal plan found for this week" };
  }

  const primaryGoal = ha?.primary_goal ?? "general_wellness";
  let tdeeKcal = goals?.daily_calorie_target ?? 2000;
  let proteinG = goals?.protein_target_g ?? 120;
  let carbsG = goals?.carbs_target_g ?? 200;
  let fatG = goals?.fat_target_g ?? 70;

  if (goals) {
    const computedTDEE = calculateTDEE({
      weight_kg:           goals.weight_kg           ?? undefined,
      height_cm:           goals.height_cm           ?? undefined,
      age:                 goals.age                 ?? undefined,
      sex:                 (goals.sex ?? undefined) as "male" | "female" | undefined,
      activity_level:      goals.activity_level      ?? "moderate",
      is_pregnant:         ha?.is_pregnant,
      pregnancy_trimester: (ha?.pregnancy_trimester ?? undefined) as 1 | 2 | 3 | undefined,
      is_breastfeeding:    ha?.is_breastfeeding,
    });
    if (computedTDEE) {
      const m = calculateMacros(computedTDEE, primaryGoal, (goals.sex ?? undefined) as "male" | "female" | undefined);
      tdeeKcal = m.daily_calorie_target;
      proteinG = m.protein_target_g;
      carbsG = m.carbs_target_g;
      fatG = m.fat_target_g;
    }
  }

  const userProfile: UserProfile & { avoided_ingredients?: string[] } = {
    primary_goal: primaryGoal,
    secondary_goals: ha?.secondary_goals ?? [],
    dietary_restrictions: ha?.dietary_restrictions ?? [],
    allergens: ha?.allergens ?? [],
    avoided_ingredients: ha?.avoided_ingredients ?? [],
    medical_conditions: ha?.medical_conditions ?? [],
    eating_disorder_flag: ha?.eating_disorder_flag ?? false,
    // TES-154: Granular eating disorder flags
    eating_disorder_anorexia_restrictive: ha?.eating_disorder_anorexia_restrictive ?? false,
    eating_disorder_binge: ha?.eating_disorder_binge ?? false,
    eating_disorder_orthorexia: ha?.eating_disorder_orthorexia ?? false,
    // TES-150: Pregnancy/breastfeeding for safety restrictions
    is_pregnant:         ha?.is_pregnant            ?? false,
    pregnancy_trimester: (ha?.pregnancy_trimester ?? undefined) as 1 | 2 | 3 | undefined,
    is_breastfeeding:    ha?.is_breastfeeding       ?? false,
    tdee_kcal: tdeeKcal,
    target_protein_g: proteinG,
    target_carbs_g: carbsG,
    target_fat_g: fatG,
  };

  const weekEnd = getWeekEnd(weekStart);
  const weekDates = getWeekDates(weekStart);

  // Build goal-specific prompt
  const promptParams: MealPlanPromptParams = {
    primaryGoal: userProfile.primary_goal ?? "general_wellness",
    tdeeKcal: userProfile.tdee_kcal ?? 2000,
    targetProteinG: userProfile.target_protein_g ?? 120,
    targetCarbsG: userProfile.target_carbs_g ?? 200,
    targetFatG: userProfile.target_fat_g ?? 70,
    dietaryRestrictions: userProfile.dietary_restrictions ?? [],
    allergens: userProfile.allergens ?? [],
    avoidedIngredients: userProfile.avoided_ingredients ?? [],
    medicalConditions: userProfile.medical_conditions ?? [],
    eatingDisorderFlag: userProfile.eating_disorder_flag ?? false,
    weekStart,
    weekEnd,
    phaseNumber: 1, // Default phase; could be enhanced to use user's actual phase
    phaseName: "Phase 1",
    budgetPreference: (settings?.budget_preference as "low" | "moderate" | "high") ?? "moderate",
  };
  const goalPrompt = getMealPlanPrompt(promptParams);

  // Generate full week plan via GigaChat
  let weekPlan;
  try {
    weekPlan = await generateWeeklyMealPlan(userProfile, weekStart, weekEnd, goalPrompt);
  } catch (err) {
    console.error("GigaChat meal plan error:", err);
    return { success: false, error: "AI generation failed" };
  }

  // Determine which dates/meals to update based on redoType
  const datesToUpdate = new Set<string>();
  const mealTypesToUpdate = new Set<string>();

  if (redoType === "individual") {
    datesToUpdate.add(affectedDate);
    mealTypesToUpdate.add(affectedMealType);
  } else if (redoType === "daily") {
    datesToUpdate.add(affectedDate);
    // Update all meal types for this day
    for (const mt of MEAL_TYPES) {
      mealTypesToUpdate.add(mt);
    }
  } else if (redoType === "weekly") {
    // Update all dates and all meal types
    for (const d of weekDates) {
      datesToUpdate.add(d);
    }
    for (const mt of MEAL_TYPES) {
      mealTypesToUpdate.add(mt);
    }
  }

  // Update slots with new recipes from GigaChat
  const slots = (existingPlan.slots ?? {}) as Record<string, Record<string, MealSlot>>;

  for (const dayPlan of weekPlan.days) {
    const date = dayPlan.date;
    if (!datesToUpdate.has(date) || !weekDates.includes(date)) continue;

    if (!slots[date]) slots[date] = {};

    for (const mealType of MEAL_TYPES) {
      // Skip if this meal type is not in the redo scope
      if (!mealTypesToUpdate.has(mealType)) continue;

      // Check if this meal is pinned - preserve if it is
      const currentSlot = slots[date]?.[mealType];
      if (currentSlot?.pinned) continue;

      const mealData = dayPlan[mealType as keyof typeof dayPlan] as MealRecipeRaw | undefined;
      if (!mealData) continue;

      const recipeRow = buildRecipeRow(mealData, mealType, user.id);
      const { data: inserted, error } = await admin
        .from("recipes")
        .insert(recipeRow)
        .select("id")
        .single();

      if (error || !inserted) {
        console.error("Recipe insert error:", error);
        continue;
      }

      slots[date][mealType] = { recipe_id: inserted.id, pinned: false };
    }
  }

  // Update meal plan with new slots
  const { error: updateError } = await admin
    .from("meal_plans")
    .update({ slots })
    .eq("id", existingPlan.id);

  if (updateError) {
    console.error("Meal plan update error:", updateError);
    return { success: false, error: "Failed to save regenerated meals" };
  }

  return { success: true };
}

/** Get redo count for current week (for paywall logic: 3 free, then paid). */
export async function getWeeklyRedoCount(
  weekNumber: number
): Promise<{ count: number; freeRemaining: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { count: 0, freeRemaining: 3 };

  const { data: redos, error } = await supabase
    .from("meal_redos")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_number", weekNumber);

  if (error) return { count: 0, freeRemaining: 3 };

  const count = redos?.length ?? 0;
  const freeRemaining = Math.max(0, 3 - count);

  return { count, freeRemaining };
}

/** Record a meal redo request (individual meal, daily, or weekly replan). */
export async function recordMealRedo(
  weekNumber: number,
  redoType: "individual" | "daily" | "weekly",
  affectedDate: string,
  reason: string,
  affectedMealType?: string
): Promise<{ success: boolean; requiresPayment: boolean; paymentAmount?: number; trialExpired?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, requiresPayment: false };

  // Paywall: check if trial has expired
  const hasAccess = await canAccessPremiumFeatures();
  if (!hasAccess) {
    return { success: false, requiresPayment: false, trialExpired: true };
  }

  const { count } = await getWeeklyRedoCount(weekNumber);

  // Check if payment is required
  const requiresPayment = count >= 3;

  const { error } = await supabase.from("meal_redos").insert({
    user_id: user.id,
    week_number: weekNumber,
    redo_type: redoType,
    affected_date: affectedDate,
    reason,
    paid: requiresPayment ? false : true, // Free=true, needs payment=false
  });

  if (error) return { success: false, requiresPayment: false };

  // Regenerate meals via GigaChat for this redo
  const weekStart = getWeekStart(affectedDate);
  const regenResult = await regenerateMealsForRedo(
    user,
    weekStart,
    redoType,
    affectedDate,
    affectedMealType ?? "breakfast"
  );

  if (!regenResult.success) {
    console.error("Meal regeneration failed:", regenResult.error);
    // Still return success for the redo record, but log the regeneration failure
  }

  revalidatePath("/dashboard/planner");

  return {
    success: true,
    requiresPayment,
    paymentAmount: requiresPayment ? 100 : undefined, // 100 RUB per redo after free limit
  };
}
