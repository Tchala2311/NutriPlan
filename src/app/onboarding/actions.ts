"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  medications: string;
  disclaimer_accepted: boolean;
}

export async function saveOnboarding(data: OnboardingFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("health_assessments").upsert(
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
      // Derived flags
      glucose_tracking_enabled: data.medical_conditions.includes("diabetes"),
      sodium_tracking_enabled: data.medical_conditions.some((c) =>
        ["hypertension", "heart_disease", "kidney_disease"].includes(c)
      ),
      eating_disorder_ui_mode: data.medical_conditions.includes("eating_disorder"),
      eating_disorder_flag: data.medical_conditions.includes("eating_disorder"),
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);

  redirect("/dashboard");
}
