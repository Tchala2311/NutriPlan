/**
 * POST /api/ai/onboarding
 *
 * Prompt 1: Post-onboarding personalised welcome analysis.
 * Triggered after the user completes the health assessment questionnaire.
 * Returns: { insight: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingInsight, UserProfile } from "@/lib/gigachat/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!assessment) {
    return NextResponse.json({ error: "No health assessment found" }, { status: 404 });
  }

  const profile: UserProfile = {
    primary_goal: assessment.primary_goal,
    dietary_restrictions: assessment.dietary_restrictions ?? [],
    allergens: assessment.allergens ?? [],
    medical_conditions: assessment.medical_conditions ?? [],
    eating_disorder_flag: assessment.eating_disorder_flag ?? false,
    // TES-154: Granular eating disorder flags
    eating_disorder_anorexia_restrictive: assessment.eating_disorder_anorexia_restrictive ?? false,
    eating_disorder_binge: assessment.eating_disorder_binge ?? false,
    eating_disorder_orthorexia: assessment.eating_disorder_orthorexia ?? false,
    secondary_goals: assessment.secondary_goals ?? [],
    tone_mode: "подробный",
    // Anthropometric fields populated from assessment if stored
    age: assessment.age ?? undefined,
    sex: assessment.sex ?? undefined,
    height_cm: assessment.height_cm ?? undefined,
    weight_kg: assessment.weight_kg ?? undefined,
    activity_level: assessment.activity_level ?? undefined,
    tdee_kcal: assessment.tdee_kcal ?? undefined,
    target_protein_g: assessment.protein_target_g ?? undefined,
  };

  try {
    const insight = await getOnboardingInsight(profile);
    return NextResponse.json({ insight });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
