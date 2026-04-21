import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Set up your profile — NutriPlan" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already onboarded → skip to dashboard
  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (assessment) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <LeafIcon className="h-7 w-7 text-sage-300" />
          <span className="font-display text-2xl font-bold text-bark-300">NutriPlan</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Let&apos;s personalise your nutrition plan — takes about 2 minutes.
        </p>
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-parchment-200 bg-parchment-100 p-8 shadow-sm">
        <OnboardingWizard />
      </div>
    </div>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
