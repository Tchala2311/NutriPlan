import type { Metadata } from "next";
import { getUserSettings } from "./actions";
import { getUserSubscription } from "@/lib/subscription";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { getUser, createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Настройки — NutriPlan" };

export default async function SettingsPage() {
  const { data: { user } } = await getUser();
  const supabase = await createClient();

  const [settings, sub] = await Promise.all([
    getUserSettings(),
    getUserSubscription(),
  ]);

  const isPremium = sub?.plan === "premium" && sub?.status === "active";
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Fetch dietary restriction and allergen options from onboarding data
  const { data: haResult } = await supabase
    .from("health_assessments")
    .select("dietary_restrictions, allergens")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Уведомления, единицы измерения, язык, диетические ограничения и управление аккаунтом.
        </p>
      </div>

      <SettingsForm
        initial={settings}
        userEmail={user?.email ?? ""}
        isPremium={isPremium}
        periodEnd={periodEnd}
        currentDietaryRestrictions={haResult?.dietary_restrictions ?? []}
        currentAllergens={haResult?.allergens ?? []}
      />
    </div>
  );
}
