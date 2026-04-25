import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyMealPlan, type UserProfile, type MealRecipeRaw } from "@/lib/gigachat/client";
import { getMealPlanPrompt, type MealPlanPromptParams } from "@/lib/planner/goal-prompts";
import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

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

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

interface MealSlot {
  recipe_id: string;
  pinned: boolean;
  days_span?: number;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const weekNumber = url.searchParams.get("week_number");
  if (!weekNumber) {
    return NextResponse.json({ error: "Missing week_number parameter" }, { status: 400 });
  }

  const { data: redos, error } = await supabase
    .from("meal_redos")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_number", parseInt(weekNumber));

  if (error) {
    return NextResponse.json({ error: "Failed to fetch redo count" }, { status: 500 });
  }

  const count = redos?.length ?? 0;
  const freeRemaining = Math.max(0, 3 - count);

  return NextResponse.json({
    count,
    freeRemaining,
    requiresPayment: count >= 3,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { week_number, redo_type, affected_date, reason, affected_meal_type } = body as {
    week_number: number;
    redo_type: "individual" | "daily" | "weekly";
    affected_date: string;
    reason: string;
    affected_meal_type?: string;
  };

  if (!week_number || !redo_type || !affected_date) {
    return NextResponse.json(
      { error: "Missing week_number, redo_type, or affected_date" },
      { status: 400 }
    );
  }

  // Count existing redos for this week
  const { data: existingRedos, error: countError } = await supabase
    .from("meal_redos")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_number", week_number);

  if (countError) {
    return NextResponse.json({ error: "Failed to check redo limit" }, { status: 500 });
  }

  const redoCount = existingRedos?.length ?? 0;
  const requiresPayment = redoCount >= 3;

  // Record redo in database
  const { error: insertError } = await supabase
    .from("meal_redos")
    .insert({
      user_id: user.id,
      week_number,
      redo_type,
      affected_date,
      reason,
      paid: !requiresPayment, // true=free, false=needs payment
    });

  if (insertError) {
    console.error("Redo insert error:", insertError);
    return NextResponse.json({ error: "Failed to record redo request" }, { status: 500 });
  }

  // If payment required, return early without regenerating
  if (requiresPayment) {
    return NextResponse.json({
      success: true,
      requiresPayment: true,
      paymentAmount: 100, // 100 RUB per redo after free limit
    });
  }

  // Regenerate meals via GigaChat
  const weekStart = getWeekStart(affected_date);
  const admin = createAdminClient();

  // Load user profile
  const [haRes, goalsRes, settingsRes, planRes] = await Promise.all([
    supabase
      .from("health_assessments")
      .select("primary_goal, secondary_goals, dietary_restrictions, allergens, avoided_ingredients, medical_conditions, eating_disorder_flag")
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
    return NextResponse.json({ error: "No meal plan found for this week" }, { status: 404 });
  }

  const primaryGoal = ha?.primary_goal ?? "general_wellness";
  let tdeeKcal = goals?.daily_calorie_target ?? 2000;
  let proteinG = goals?.protein_target_g ?? 120;
  let carbsG = goals?.carbs_target_g ?? 200;
  let fatG = goals?.fat_target_g ?? 70;

  if (goals) {
    const computedTDEE = calculateTDEE({
      weight_kg: goals.weight_kg ?? undefined,
      height_cm: goals.height_cm ?? undefined,
      age: goals.age ?? undefined,
      sex: (goals.sex ?? undefined) as "male" | "female" | undefined,
      activity_level: goals.activity_level ?? "moderate",
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
    tdee_kcal: tdeeKcal,
    target_protein_g: proteinG,
    target_carbs_g: carbsG,
    target_fat_g: fatG,
  };

  const weekEnd = getWeekEnd(weekStart);
  const weekDates = getWeekDates(weekStart);

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
    phaseNumber: 1,
    phaseName: "Phase 1",
    budgetPreference: (settings?.budget_preference as "low" | "moderate" | "high") ?? "moderate",
  };

  const goalPrompt = getMealPlanPrompt(promptParams);

  // Generate meal plan
  let weekPlan;
  try {
    weekPlan = await generateWeeklyMealPlan(userProfile, weekStart, weekEnd, goalPrompt);
  } catch (err) {
    console.error("GigaChat meal plan error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  // Determine which dates/meals to update
  const datesToUpdate = new Set<string>();
  const mealTypesToUpdate = new Set<string>();

  if (redo_type === "individual") {
    datesToUpdate.add(affected_date);
    mealTypesToUpdate.add(affected_meal_type ?? "breakfast");
  } else if (redo_type === "daily") {
    datesToUpdate.add(affected_date);
    for (const mt of MEAL_TYPES) {
      mealTypesToUpdate.add(mt);
    }
  } else if (redo_type === "weekly") {
    for (const d of weekDates) {
      datesToUpdate.add(d);
    }
    for (const mt of MEAL_TYPES) {
      mealTypesToUpdate.add(mt);
    }
  }

  // Update slots with new recipes
  const slots = (existingPlan.slots ?? {}) as Record<string, Record<string, MealSlot>>;

  for (const dayPlan of weekPlan.days) {
    const date = dayPlan.date;
    if (!datesToUpdate.has(date) || !weekDates.includes(date)) continue;

    if (!slots[date]) slots[date] = {};

    for (const mealType of MEAL_TYPES) {
      if (!mealTypesToUpdate.has(mealType)) continue;

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

  // Update meal plan
  const { error: updateError } = await admin
    .from("meal_plans")
    .update({ slots })
    .eq("id", existingPlan.id);

  if (updateError) {
    console.error("Meal plan update error:", updateError);
    return NextResponse.json({ error: "Failed to save regenerated meals" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    requiresPayment: false,
  });
}
