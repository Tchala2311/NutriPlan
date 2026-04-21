import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserGoals } from "./profile/actions";

export const metadata: Metadata = { title: "Dashboard — NutriPlan" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const today = new Date().toISOString().split("T")[0];

  const [{ data: entries }, goals] = await Promise.all([
    supabase
      .from("nutrition_logs")
      .select("calories, protein_g, carbs_g, fat_g")
      .eq("logged_date", today),
    getUserGoals(),
  ]);

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein_g: acc.protein_g + Number(e.protein_g ?? 0),
      carbs_g: acc.carbs_g + Number(e.carbs_g ?? 0),
      fat_g: acc.fat_g + Number(e.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const hasEntries = (entries ?? []).length > 0;

  const statCards = [
    {
      label: "Calories today",
      value: hasEntries ? Math.round(totals.calories) : null,
      target: goals.daily_calorie_target,
      unit: "kcal",
    },
    {
      label: "Protein",
      value: hasEntries ? Math.round(totals.protein_g) : null,
      target: goals.protein_target_g,
      unit: "g",
    },
    {
      label: "Carbs",
      value: hasEntries ? Math.round(totals.carbs_g) : null,
      target: goals.carbs_target_g,
      unit: "g",
    },
    {
      label: "Fats",
      value: hasEntries ? Math.round(totals.fat_g) : null,
      target: goals.fat_target_g,
      unit: "g",
    },
  ];

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

      {/* Stat cards with progress vs target */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const pct = card.value !== null ? Math.min(100, Math.round((card.value / card.target) * 100)) : 0;
          const over = card.value !== null && card.value > card.target;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-parchment-200 bg-parchment-100 p-4"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </p>
              {card.value !== null ? (
                <>
                  <p className={`mt-1.5 text-2xl font-semibold ${over ? "text-amber-600" : "text-bark-300"}`}>
                    {card.value}
                    <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                      {" "}/ {card.target} {card.unit}
                    </span>
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-parchment-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-amber-400" : "bg-sage-300"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{pct}% of target</p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-2xl font-semibold text-bark-300">
                    —
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ {card.target} {card.unit}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">No entries yet today</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/log"
          className="group rounded-xl border border-parchment-200 bg-parchment-100 p-6 hover:border-bark-100 hover:bg-parchment-200 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="rounded-lg bg-bark-300 p-2">
              <LogIcon className="h-4 w-4 text-primary-foreground" />
            </span>
            <h2 className="font-semibold text-bark-300 text-sm">Log food</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Track your meals and macros for today.
          </p>
        </Link>

        <Link
          href="/dashboard/profile"
          className="group rounded-xl border border-parchment-200 bg-parchment-100 p-6 hover:border-bark-100 hover:bg-parchment-200 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="rounded-lg bg-sage-300 p-2">
              <ProfileIcon className="h-4 w-4 text-primary-foreground" />
            </span>
            <h2 className="font-semibold text-bark-300 text-sm">Profile & Goals</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            View your account and set nutrition targets.
          </p>
        </Link>
      </div>
    </div>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
