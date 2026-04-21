"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UserGoals = {
  primary_goal: "weight_loss" | "muscle_gain" | "maintenance" | null;
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
};

/** Default macro targets per goal type */
const GOAL_DEFAULTS: Record<string, Omit<UserGoals, "primary_goal">> = {
  weight_loss:  { daily_calorie_target: 1800, protein_target_g: 150, carbs_target_g: 160, fat_target_g: 60 },
  muscle_gain:  { daily_calorie_target: 2800, protein_target_g: 200, carbs_target_g: 300, fat_target_g: 80 },
  maintenance:  { daily_calorie_target: 2200, protein_target_g: 160, carbs_target_g: 240, fat_target_g: 70 },
};

export async function getUserGoals(): Promise<UserGoals> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Try user_goals table
  const { data: goals } = await supabase
    .from("user_goals")
    .select("primary_goal, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g")
    .eq("user_id", user.id)
    .maybeSingle();

  if (goals) {
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

export async function saveUserGoals(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const goals = {
    user_id: user.id,
    primary_goal: (formData.get("primary_goal") as string) || null,
    daily_calorie_target: Number(formData.get("daily_calorie_target") ?? 2000),
    protein_target_g: Number(formData.get("protein_target_g") ?? 150),
    carbs_target_g: Number(formData.get("carbs_target_g") ?? 200),
    fat_target_g: Number(formData.get("fat_target_g") ?? 65),
  };

  const { error } = await supabase
    .from("user_goals")
    .upsert(goals, { onConflict: "user_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
}
