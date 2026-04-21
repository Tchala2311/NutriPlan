import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OnboardingCompleteClient } from "@/components/onboarding/OnboardingCompleteClient";

export const metadata: Metadata = { title: "Setting up your plan — NutriPlan" };

export default async function OnboardingCompletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already onboarded — skip straight to dashboard
  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (assessment) redirect("/dashboard");

  return <OnboardingCompleteClient />;
}
