"use server";

import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateTDEE, calculateMacros } from "@/lib/nutrition/tdee";

export interface OnboardingFormData {
  // Step 1 – Health Goals
  health_goals: string[];
  primary_goal: string;
  // Step 2 – Food Preferences
  dietary_restrictions: string[];
  allergens: string[];
  avoided_ingredients: string;
  // Step 3 – Medical & Disclaimer
  medical_conditions: string[];
  eating_disorder_types?: string[]; // TES-154: granular eating disorder flags
  medications: string;
  disclaimer_accepted: boolean;
  // Optional biometrics (Step 1 TDEE inputs)
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  sex?: "male" | "female" | null;
  activity_level?: string | null;
  // Step 2 – Pregnancy / Breastfeeding
  is_pregnant?: boolean;
  pregnancy_trimester?: 1 | 2 | 3 | null;
  is_breastfeeding?: boolean;
}

const GOAL_DEFAULTS: Record<string, { daily_calorie_target: number; protein_target_g: number; carbs_target_g: number; fat_target_g: number }> = {
  weight_loss:        { daily_calorie_target: 1800, protein_target_g: 150, carbs_target_g: 160, fat_target_g: 60 },
  muscle_gain:        { daily_calorie_target: 2800, protein_target_g: 200, carbs_target_g: 300, fat_target_g: 80 },
  maintenance:        { daily_calorie_target: 2200, protein_target_g: 160, carbs_target_g: 240, fat_target_g: 70 },
  disease_management: { daily_calorie_target: 2000, protein_target_g: 130, carbs_target_g: 220, fat_target_g: 67 },
  general_wellness:   { daily_calorie_target: 2000, protein_target_g: 125, carbs_target_g: 250, fat_target_g: 56 },
};

export async function saveOnboarding(data: OnboardingFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error: haError } = await supabase.from("health_assessments").upsert(
    {
      user_id: user.id,
      health_goals: data.health_goals,
      primary_goal: data.primary_goal || null,
      dietary_restrictions: data.dietary_restrictions,
      allergens: data.allergens,
      avoided_ingredients: data.avoided_ingredients
        ? data.avoided_ingredients.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      medical_conditions: data.medical_conditions,
      medications: data.medications || null,
      medications_text: data.medications || null,
      disclaimer_accepted: data.disclaimer_accepted,
      disclaimer_accepted_at: data.disclaimer_accepted ? new Date().toISOString() : null,
      // Pregnancy / breastfeeding
      is_pregnant:          data.is_pregnant          ?? false,
      pregnancy_trimester:  data.pregnancy_trimester  ?? null,
      is_breastfeeding:     data.is_breastfeeding     ?? false,
      // Derived flags
      glucose_tracking_enabled: data.medical_conditions.includes("diabetes"),
      sodium_tracking_enabled: data.medical_conditions.some((c) =>
        ["hypertension", "heart_disease", "kidney_disease"].includes(c)
      ),
      // TES-154: Granular eating disorder flags
      eating_disorder_anorexia_restrictive: data.eating_disorder_types?.includes("anorexia_restrictive") ?? false,
      eating_disorder_binge: data.eating_disorder_types?.includes("binge_eating") ?? false,
      eating_disorder_orthorexia: data.eating_disorder_types?.includes("orthorexia") ?? false,
      // Keep legacy flags for backward compatibility
      eating_disorder_ui_mode: (data.eating_disorder_types?.length ?? 0) > 0,
      eating_disorder_flag: (data.eating_disorder_types?.length ?? 0) > 0,
    },
    { onConflict: "user_id" }
  );

  if (haError) throw new Error(haError.message);

  // Compute TDEE + macros from biometrics if provided; fall back to goal averages.
  const bio = {
    weight_kg:           data.weight_kg           ?? undefined,
    height_cm:           data.height_cm           ?? undefined,
    age:                 data.age                 ?? undefined,
    sex:                 (data.sex ?? undefined) as "male" | "female" | undefined,
    activity_level:      data.activity_level      ?? "moderate",
    is_pregnant:         data.is_pregnant         ?? false,
    pregnancy_trimester: (data.pregnancy_trimester ?? undefined) as 1 | 2 | 3 | undefined,
    is_breastfeeding:    data.is_breastfeeding    ?? false,
  };
  const tdeeKcal = calculateTDEE(bio);
  const macros   = tdeeKcal ? calculateMacros(tdeeKcal, data.primary_goal, bio.sex) : null;
  const defaults = GOAL_DEFAULTS[data.primary_goal] ?? GOAL_DEFAULTS.maintenance;

  const { error: goalsError } = await supabase.from("user_goals").upsert(
    {
      user_id:              user.id,
      primary_goal:         data.primary_goal || null,
      weight_kg:            data.weight_kg    ?? null,
      height_cm:            data.height_cm    ?? null,
      age:                  data.age          ?? null,
      sex:                  data.sex          ?? null,
      activity_level:       data.activity_level ?? "moderate",
      daily_calorie_target: macros?.daily_calorie_target ?? defaults.daily_calorie_target,
      protein_target_g:     macros?.protein_target_g     ?? defaults.protein_target_g,
      carbs_target_g:       macros?.carbs_target_g       ?? defaults.carbs_target_g,
      fat_target_g:         macros?.fat_target_g         ?? defaults.fat_target_g,
    },
    { onConflict: "user_id" }
  );

  if (goalsError) throw new Error(goalsError.message);

  redirect("/dashboard", RedirectType.replace);
}
