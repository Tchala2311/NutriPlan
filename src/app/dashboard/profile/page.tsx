import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GoalSettingsForm } from "@/components/dashboard/GoalSettingsForm";
import { getUserGoals } from "./actions";

export const metadata: Metadata = { title: "Profile & Goals — NutriPlan" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const goals = await getUserGoals();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Profile & Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account information and nutrition targets.
        </p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-4">Account</h2>
        <dl className="space-y-3">
          {fullName && (
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-bark-300">{fullName}</dd>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-bark-300">{email}</dd>
          </div>
        </dl>
      </div>

      {/* Goal settings */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-6">
          Nutrition Goals
        </h2>
        <GoalSettingsForm initial={goals} />
      </div>
    </div>
  );
}
