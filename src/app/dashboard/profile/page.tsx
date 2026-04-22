import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoalSettingsForm } from "@/components/dashboard/GoalSettingsForm";
import { TrendsSection } from "@/components/dashboard/TrendsSection";
import { getUserGoals, getTrendsData } from "./actions";
import { getUserSubscription } from "@/lib/subscription";
import { UpgradeButton } from "@/components/subscription/UpgradeButton";

export const metadata: Metadata = { title: "Профиль и цели — NutriPlan" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const goals = await getUserGoals();
  const [sub, trends] = await Promise.all([
    getUserSubscription(),
    getTrendsData(goals),
  ]);

  const isPremium = sub?.plan === "premium" && sub?.status === "active";
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Профиль и цели</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Информация об аккаунте и настройки нутриентов.
        </p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-4">Аккаунт</h2>
        <dl className="space-y-3">
          {fullName && (
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Имя</dt>
              <dd className="font-medium text-bark-300">{fullName}</dd>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-bark-300">{email}</dd>
          </div>
        </dl>
      </div>

      {/* Subscription */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-4">Подписка</h2>

        {isPremium ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-700">
                  Premium
                </span>
                <span className="text-xs text-muted-foreground">
                  {sub?.status === "active" ? "активна" : sub?.status === "trialing" ? "пробный" : sub?.status === "cancelled" ? "отменена" : sub?.status ?? ""}
                </span>
              </div>
              {periodEnd && (
                <p className="text-sm text-muted-foreground">
                  Действует до {periodEnd}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-parchment-200 px-2.5 py-0.5 text-xs font-semibold text-bark-200">
                  Free
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Перейдите на Premium, чтобы разблокировать планировщик и рецепты.
              </p>
            </div>
            <div className="shrink-0 w-44">
              <UpgradeButton variant="light" />
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-parchment-200">
          <Link
            href="/pricing"
            className="text-sm text-sage-500 hover:text-sage-600 transition-colors"
          >
            Посмотреть все тарифы →
          </Link>
        </div>
      </div>

      {/* Goal settings */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-6">
          Цели по нутриентам
        </h2>
        <GoalSettingsForm initial={goals} />
      </div>

      {/* Trends */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 mb-6">
        <TrendsSection trends={trends} goals={goals} />
      </div>

      {/* Settings shortcut — mobile only (Settings not in bottom nav) */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6 lg:hidden">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-3">Ещё</h2>
        <Link
          href="/dashboard/settings"
          className="flex items-center justify-between text-sm font-medium text-bark-200 hover:text-bark-300 transition-colors py-1"
        >
          <span>Настройки приложения</span>
          <span className="text-muted-foreground">→</span>
        </Link>
      </div>
    </div>
  );
}
