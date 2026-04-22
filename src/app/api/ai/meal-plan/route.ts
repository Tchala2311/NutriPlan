import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyMealPlan, type MealRecipeRaw } from "@/lib/gigachat/client";
import type { UserProfile } from "@/lib/gigachat/client";
import { getMealPlanPrompt, type MealPlanPromptParams } from "@/lib/planner/goal-prompts";
import { fromGlobalWeek } from "@/lib/planner/phases";

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

  const body = await req.json().catch(() => ({}));
  const weekStart = getWeekStart(body.week_start);
  const weekEnd = getWeekEnd(weekStart);
  const dates = weekDates(weekStart);

  // Load health assessment for user profile
  const { data: ha } = await supabase
    .from("health_assessments")
    .select("primary_goal, secondary_goals, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, eating_disorder_flag")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: goals } = await supabase
    .from("user_goals")
    .select("daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g")
    .eq("user_id", user.id)
    .maybeSingle();

  const userProfile: UserProfile & { avoided_ingredients?: string[] } = {
    primary_goal: ha?.primary_goal ?? "general_wellness",
    secondary_goals: ha?.secondary_goals ?? [],
    dietary_restrictions: ha?.dietary_restrictions ?? [],
    allergens: ha?.allergens ?? [],
    avoided_ingredients: ha?.avoided_ingredients ?? [],
    medical_conditions: ha?.medical_conditions ?? [],
    eating_disorder_flag: ha?.eating_disorder_flag ?? false,
    tdee_kcal: goals?.daily_calorie_target ?? 2000,
    target_protein_g: goals?.protein_target_g ?? 120,
    target_carbs_g: goals?.carbs_target_g ?? 200,
    target_fat_g: goals?.fat_target_g ?? 70,
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
  const { phase: planPhase, weekInPhase } = fromGlobalWeek(Math.max(1, Math.min(8, globalWeekNum)));

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
