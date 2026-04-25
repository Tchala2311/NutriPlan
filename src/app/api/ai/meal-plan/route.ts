import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyMealPlan, type MealRecipeRaw } from "@/lib/gigachat/client";
import type { UserProfile } from "@/lib/gigachat/client";
import { getMealPlanPrompt, type MealPlanPromptParams } from "@/lib/planner/goal-prompts";
import { fromGlobalWeek } from "@/lib/planner/phases";
import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";
import { canAccessPremiumFeatures } from "@/lib/subscription";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

/** Derive week Monday date string from any date. */
function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

/** Build 7 date strings for the week. */
function weekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Compute per-100g values from per-serving + estimated weight.
 * We estimate 300g for main meals and 150g for snacks.
 */
function per100g(value: number, estimatedWeightG: number): number {
  return Math.round((value / estimatedWeightG) * 100 * 10) / 10;
}

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Paywall: block meal plan generation after trial ends
  const hasAccess = await canAccessPremiumFeatures();
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Trial expired. Upgrade to premium to continue." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const weekStart = getWeekStart(body.week_start);
  const weekEnd = getWeekEnd(weekStart);
  const dates = weekDates(weekStart);

  // Load health assessment for user profile
  const { data: ha } = await supabase
    .from("health_assessments")
    .select("primary_goal, secondary_goals, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, eating_disorder_flag, eating_disorder_anorexia_restrictive, eating_disorder_binge, eating_disorder_orthorexia, is_pregnant, pregnancy_trimester, is_breastfeeding")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: goals } = await supabase
    .from("user_goals")
    .select("daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g, weight_kg, height_cm, age, sex, activity_level")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("budget_preference")
    .eq("user_id", user.id)
    .maybeSingle();

  // Auto-compute TDEE + macros from stored biometrics; fall back to stored targets.
  const primaryGoal = ha?.primary_goal ?? "general_wellness";
  let tdeeKcal      = goals?.daily_calorie_target ?? 2000;
  let proteinG      = goals?.protein_target_g     ?? 120;
  let carbsG        = goals?.carbs_target_g       ?? 200;
  let fatG          = goals?.fat_target_g         ?? 70;

  if (goals) {
    const computedTDEE = calculateTDEE({
      weight_kg:           goals.weight_kg           ?? undefined,
      height_cm:           goals.height_cm           ?? undefined,
      age:                 goals.age                 ?? undefined,
      sex:                 (goals.sex ?? undefined) as "male" | "female" | undefined,
      activity_level:      goals.activity_level      ?? "moderate",
      is_pregnant:         ha?.is_pregnant            ?? false,
      pregnancy_trimester: (ha?.pregnancy_trimester   ?? undefined) as 1 | 2 | 3 | undefined,
      is_breastfeeding:    ha?.is_breastfeeding       ?? false,
    });
    if (computedTDEE) {
      const m = calculateMacros(computedTDEE, primaryGoal, (goals.sex ?? undefined) as "male" | "female" | undefined);
      tdeeKcal = m.daily_calorie_target;
      proteinG = m.protein_target_g;
      carbsG   = m.carbs_target_g;
      fatG     = m.fat_target_g;
    }
  }

  const userProfile: UserProfile & { avoided_ingredients?: string[]; budget_preference?: string } = {
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
    budget_preference: settings?.budget_preference ?? "moderate",
    tdee_kcal:        tdeeKcal,
    target_protein_g: proteinG,
    target_carbs_g:   carbsG,
    target_fat_g:     fatG,
    is_pregnant:         ha?.is_pregnant            ?? false,
    pregnancy_trimester: (ha?.pregnancy_trimester   ?? undefined) as 1 | 2 | 3 | undefined,
    is_breastfeeding:    ha?.is_breastfeeding       ?? false,
  };

  // Load existing plan to respect pinned slots
  const { data: existingPlan } = await supabase
    .from("meal_plans")
    .select("id, slots")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  const pinnedSlots: Record<string, Record<string, string>> = {};
  if (existingPlan?.slots) {
    for (const [date, daySlots] of Object.entries(existingPlan.slots as Record<string, Record<string, { recipe_id: string; pinned: boolean }>>)) {
      for (const [mType, slotData] of Object.entries(daySlots)) {
        if (slotData?.pinned && slotData?.recipe_id) {
          if (!pinnedSlots[date]) pinnedSlots[date] = {};
          pinnedSlots[date][mType] = slotData.recipe_id;
        }
      }
    }
  }

  // Derive phase from request body (optional; defaults to phase 1)
  const globalWeekNum: number = body.global_week ?? 1;
  const { phase: planPhase } = fromGlobalWeek(Math.max(1, Math.min(8, globalWeekNum)));

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
    phaseNumber: planPhase.number,
    phaseName: planPhase.nameRu,
    budgetPreference: (userProfile.budget_preference as "low" | "moderate" | "high") ?? "moderate",
    isPregnant:         ha?.is_pregnant            ?? false,
    pregnancyTrimester: (ha?.pregnancy_trimester   ?? undefined) as 1 | 2 | 3 | undefined,
    isBreastfeeding:    ha?.is_breastfeeding       ?? false,
  };
  const goalPrompt = getMealPlanPrompt(promptParams);

  // Generate meal plan via GigaChat (goal-specific prompt)
  let weekPlan;
  try {
    weekPlan = await generateWeeklyMealPlan(userProfile, weekStart, weekEnd, goalPrompt);
  } catch (err) {
    console.error("GigaChat meal plan error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const admin = createAdminClient();

  // Build slots + insert recipes
  const slots: Record<string, Record<string, { recipe_id: string; pinned: boolean }>> = {};

  for (const dayPlan of weekPlan.days) {
    const date = dayPlan.date;
    if (!dates.includes(date)) continue;
    slots[date] = {};

    for (const mealType of MEAL_TYPES) {
      // If slot is pinned, preserve existing recipe
      const pinnedId = pinnedSlots[date]?.[mealType];
      if (pinnedId) {
        slots[date][mealType] = { recipe_id: pinnedId, pinned: true };
        continue;
      }

      const mealData = dayPlan[mealType] as MealRecipeRaw | undefined;
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

  // Upsert meal plan
  const { data: plan, error: planError } = await admin
    .from("meal_plans")
    .upsert(
      { user_id: user.id, week_start_date: weekStart, slots },
      { onConflict: "user_id,week_start_date" }
    )
    .select("id, week_start_date, slots")
    .single();

  if (planError) {
    console.error("Meal plan upsert error:", planError);
    return NextResponse.json({ error: "Failed to save meal plan" }, { status: 500 });
  }

  // Fetch all referenced recipes
  const allRecipeIds = new Set<string>();
  for (const daySlots of Object.values(slots)) {
    for (const slot of Object.values(daySlots)) {
      if (slot.recipe_id) allRecipeIds.add(slot.recipe_id);
    }
  }

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, prep_time_min, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, ingredients, instructions, dietary_tags, substitutions")
    .in("id", [...allRecipeIds]);

  return NextResponse.json({
    plan: { id: plan.id, week_start_date: plan.week_start_date, slots: plan.slots },
    recipes: Object.fromEntries((recipes ?? []).map((r) => [r.id, r])),
  });
}
