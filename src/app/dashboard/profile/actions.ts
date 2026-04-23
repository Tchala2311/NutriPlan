"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";

export type UserGoals = {
  primary_goal: "weight_loss" | "muscle_gain" | "maintenance" | null;
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  // Biometrics (optional — drive auto TDEE calculation)
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  sex?: "male" | "female" | null;
  activity_level?: string | null;
};

/** Default macro targets per goal type — used when biometrics absent */
const GOAL_DEFAULTS: Record<string, Omit<UserGoals, "primary_goal">> = {
  weight_loss:        { daily_calorie_target: 1800, protein_target_g: 150, carbs_target_g: 160, fat_target_g: 60 },
  muscle_gain:        { daily_calorie_target: 2800, protein_target_g: 200, carbs_target_g: 300, fat_target_g: 80 },
  maintenance:        { daily_calorie_target: 2200, protein_target_g: 160, carbs_target_g: 240, fat_target_g: 70 },
  disease_management: { daily_calorie_target: 2000, protein_target_g: 130, carbs_target_g: 220, fat_target_g: 67 },
  general_wellness:   { daily_calorie_target: 2000, protein_target_g: 125, carbs_target_g: 250, fat_target_g: 56 },
};

export async function getUserGoals(): Promise<UserGoals> {
  const supabase = await createClient();
  const { data: { user } } = await getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Try user_goals table
  const { data: goals } = await supabase
    .from("user_goals")
    .select("primary_goal, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g, weight_kg, height_cm, age, sex, activity_level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (goals) {
    // Recompute from biometrics when available; otherwise use stored values.
    const tdee = calculateTDEE({
      weight_kg:      goals.weight_kg      ?? undefined,
      height_cm:      goals.height_cm      ?? undefined,
      age:            goals.age            ?? undefined,
      sex:            (goals.sex ?? undefined) as "male" | "female" | undefined,
      activity_level: goals.activity_level ?? "moderate",
    });
    if (tdee) {
      const computed = calculateMacros(tdee, goals.primary_goal ?? "general_wellness");
      return { ...goals, ...computed } as UserGoals;
    }
    return goals as UserGoals;
  }

  // 2. Derive defaults from health_assessment if present
  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("primary_goal, protein_target_g")
    .eq("user_id", user.id)
    .maybeSingle();

  const goalKey = assessment?.primary_goal as string | undefined;
  const base = GOAL_DEFAULTS[goalKey ?? "maintenance"] ?? GOAL_DEFAULTS.maintenance;

  return {
    primary_goal: (assessment?.primary_goal as UserGoals["primary_goal"]) ?? null,
    daily_calorie_target: base.daily_calorie_target,
    protein_target_g: assessment?.protein_target_g ?? base.protein_target_g,
    carbs_target_g: base.carbs_target_g,
    fat_target_g: base.fat_target_g,
  };
}

// ─── Trends ──────────────────────────────────────────────────────────────────

export type DayData = {
  date: string;       // YYYY-MM-DD
  dayLabel: string;   // "Пн", "Вт"…
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type TrendsData = {
  days: DayData[];           // last 30 days, filled with zeros for days with no entries
  streak: number;            // consecutive days with ≥1 log entry, ending today or yesterday
  avgCalories7d: number;
  bestMacroDay: string | null;   // day label of best macro day in last 7d
  topFoods: string[];            // top 3 most-logged food names in last 7d
};

const RU_DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export async function getTrendsData(goals: UserGoals): Promise<TrendsData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { days: [], streak: 0, avgCalories7d: 0, bestMacroDay: null, topFoods: [] };

  // Fetch last 30 days of logs
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 29);
  const fromStr = fromDate.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const { data: entries } = await supabase
    .from("nutrition_logs")
    .select("logged_date, calories, protein_g, carbs_g, fat_g, food_name")
    .eq("user_id", user.id)
    .gte("logged_date", fromStr)
    .lte("logged_date", todayStr)
    .order("logged_date", { ascending: true });

  // Aggregate by date
  const byDate = new Map<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number; foods: string[] }>();
  for (const e of entries ?? []) {
    const d = e.logged_date as string;
    const cur = byDate.get(d) ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, foods: [] };
    cur.calories += e.calories ?? 0;
    cur.protein_g += Number(e.protein_g ?? 0);
    cur.carbs_g += Number(e.carbs_g ?? 0);
    cur.fat_g += Number(e.fat_g ?? 0);
    cur.foods.push(e.food_name as string);
    byDate.set(d, cur);
  }

  // Build 30-day array
  const days: DayData[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const agg = byDate.get(dateStr);
    days.push({
      date: dateStr,
      dayLabel: RU_DAYS[d.getDay()],
      calories: Math.round(agg?.calories ?? 0),
      protein_g: Math.round(agg?.protein_g ?? 0),
      carbs_g: Math.round(agg?.carbs_g ?? 0),
      fat_g: Math.round(agg?.fat_g ?? 0),
    });
  }

  // Streak: count backwards from today (or yesterday if today is empty)
  const loggedDates = new Set(byDate.keys());
  let streak = 0;
  let cursor = new Date(today);
  if (!loggedDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const s = cursor.toISOString().split("T")[0];
    if (!loggedDates.has(s)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Last 7 days
  const last7 = days.slice(-7);
  const logged7 = last7.filter((d) => d.calories > 0);
  const avgCalories7d = logged7.length > 0
    ? Math.round(logged7.reduce((s, d) => s + d.calories, 0) / logged7.length)
    : 0;

  // Best macro day: day where sum of % deviations from all macro targets is smallest
  let bestMacroDay: string | null = null;
  let bestScore = Infinity;
  for (const d of logged7) {
    const score =
      Math.abs(d.protein_g - goals.protein_target_g) / goals.protein_target_g +
      Math.abs(d.carbs_g - goals.carbs_target_g) / goals.carbs_target_g +
      Math.abs(d.fat_g - goals.fat_target_g) / goals.fat_target_g;
    if (score < bestScore) { bestScore = score; bestMacroDay = d.dayLabel; }
  }

  // Top foods last 7d
  const foodCount = new Map<string, number>();
  for (const e of (entries ?? []).filter((e) => {
    const d = e.logged_date as string;
    return d >= last7[0]?.date;
  })) {
    const name = e.food_name as string;
    foodCount.set(name, (foodCount.get(name) ?? 0) + 1);
  }
  const topFoods = [...foodCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return { days, streak, avgCalories7d, bestMacroDay, topFoods };
}

// ─── Save goals ──────────────────────────────────────────────────────────────

export async function saveUserGoals(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const primaryGoal = (formData.get("primary_goal") as string) || null;

  // Parse biometrics (may be absent for users who skip them)
  const weight_kg     = formData.get("weight_kg")     ? parseFloat(String(formData.get("weight_kg")))  : null;
  const height_cm     = formData.get("height_cm")     ? parseInt(String(formData.get("height_cm")), 10) : null;
  const age           = formData.get("age")           ? parseInt(String(formData.get("age")), 10)       : null;
  const sex           = (formData.get("sex") as "male" | "female" | null) || null;
  const activity_level = (formData.get("activity_level") as string) || "moderate";

  // Auto-compute macros from biometrics; fall back to form values if absent
  const bio    = { weight_kg: weight_kg ?? undefined, height_cm: height_cm ?? undefined, age: age ?? undefined, sex: sex ?? undefined, activity_level };
  const tdee   = calculateTDEE(bio);
  const macros = tdee ? calculateMacros(tdee, primaryGoal ?? "general_wellness") : null;

  const goals = {
    user_id:              user.id,
    primary_goal:         primaryGoal,
    weight_kg,
    height_cm,
    age,
    sex,
    activity_level,
    daily_calorie_target: macros?.daily_calorie_target ?? Number(formData.get("daily_calorie_target") ?? 2000),
    protein_target_g:     macros?.protein_target_g     ?? Number(formData.get("protein_target_g") ?? 150),
    carbs_target_g:       macros?.carbs_target_g       ?? Number(formData.get("carbs_target_g") ?? 200),
    fat_target_g:         macros?.fat_target_g         ?? Number(formData.get("fat_target_g") ?? 65),
  };

  // Upsert: check if row exists, then update or insert
  const { data: existing, error: checkError } = await supabase
    .from("user_goals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message);

  if (existing) {
    // Row exists, update it
    const { error: updateError } = await supabase
      .from("user_goals")
      .update(goals)
      .eq("id", existing.id);

    if (updateError) throw new Error(updateError.message);
  } else {
    // Row doesn't exist, insert new row
    const { error: insertError } = await supabase
      .from("user_goals")
      .insert([goals]);

    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
}
