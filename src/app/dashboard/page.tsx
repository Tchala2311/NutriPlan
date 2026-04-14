import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your nutrition overview for today.
        </p>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-parchment-200 bg-parchment-100 p-4"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {card.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-bark-300">{card.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Coming soon panel */}
      <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-8 text-center">
        <p className="font-display text-lg font-semibold text-bark-200">
          Your personalised nutrition plan is coming soon
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Complete your profile and nutrition goals to unlock AI-powered meal suggestions
          and daily tracking.
        </p>
      </div>
    </div>
  );
}

const STAT_CARDS = [
  { label: "Calories today", value: "—", sub: "Goal: not set" },
  { label: "Protein", value: "—", sub: "Goal: not set" },
  { label: "Carbs", value: "—", sub: "Goal: not set" },
  { label: "Fats", value: "—", sub: "Goal: not set" },
];
