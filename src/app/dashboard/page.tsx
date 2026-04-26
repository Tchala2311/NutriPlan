import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { getUserGoals } from './profile/actions';
import { getUserSubscription } from '@/lib/subscription';
import { WaterWidget } from '@/components/dashboard/WaterWidget';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';

export const metadata: Metadata = { title: 'Главная — NutriPlan' };

/** Compute current logging streak (consecutive days with ≥1 entry, ending today). */
function computeStreak(loggedDates: string[], todayStr: string): number {
  const dateSet = new Set(loggedDates);
  let streak = 0;
  const d = new Date(todayStr + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split('T')[0];
    if (!dateSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  const {
    data: { user },
  } = await getUser();
  const supabase = await createClient();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'вас';

  const today = new Date().toISOString().split('T')[0];
  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;

  // Date 30 days ago for streak computation
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const since30 = d30.toISOString().split('T')[0];

  const [
    { data: entries },
    goals,
    { data: waterRows },
    { data: goalsRow },
    { data: streakDates },
    sub,
  ] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user!.id)
      .eq('logged_date', today),
    getUserGoals(),
    supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', user!.id)
      .gte('logged_at', dayStart)
      .lte('logged_at', dayEnd),
    supabase.from('user_goals').select('water_target_ml').eq('user_id', user!.id).maybeSingle(),
    supabase
      .from('nutrition_logs')
      .select('logged_date')
      .eq('user_id', user!.id)
      .gte('logged_date', since30)
      .order('logged_date', { ascending: false }),
    getUserSubscription(),
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
  const isFirstRun = !hasEntries && (streakDates ?? []).length === 0;
  const waterTotalMl = (waterRows ?? []).reduce((s, r) => s + (r.amount_ml ?? 0), 0);
  const waterTargetMl = (goalsRow as { water_target_ml?: number } | null)?.water_target_ml ?? 2000;

  // Streak
  const loggedDates = (streakDates ?? []).map((r) => (r as { logged_date: string }).logged_date);
  const currentStreak = computeStreak(loggedDates, today);

  // Trial expiry banner: show if user is on free plan and account is < 14 days old
  const isPremiumActive = sub?.plan === 'premium' && sub?.status === 'active';
  const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
  const trialDaysLeft = userCreatedAt
    ? Math.max(0, 14 - Math.floor((Date.now() - userCreatedAt.getTime()) / 86_400_000))
    : 0;
  const showTrialBanner = !isPremiumActive && trialDaysLeft > 0;

  const statCards = [
    {
      label: 'Калории сегодня',
      value: hasEntries ? Math.round(totals.calories) : null,
      target: goals.daily_calorie_target,
      unit: 'ккал',
    },
    {
      label: 'Белки',
      value: hasEntries ? Math.round(totals.protein_g) : null,
      target: goals.protein_target_g,
      unit: 'г',
    },
    {
      label: 'Углеводы',
      value: hasEntries ? Math.round(totals.carbs_g) : null,
      target: goals.carbs_target_g,
      unit: 'г',
    },
    {
      label: 'Жиры',
      value: hasEntries ? Math.round(totals.fat_g) : null,
      target: goals.fat_target_g,
      unit: 'г',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">
          {isFirstRun ? `Добро пожаловать, ${firstName}!` : `С возвращением, ${firstName}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFirstRun ? 'Профиль создан. Начните с первого приёма пищи.' : 'Питание сегодня.'}
        </p>
      </div>

      {/* First-run onboarding completion card */}
      {isFirstRun && (
        <div className="mb-6 rounded-xl border border-sage-200 bg-sage-50 p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">
              🌱
            </span>
            <div>
              <p className="text-sm font-semibold text-sage-700">Профиль готов — можно начинать!</p>
              <p className="mt-0.5 text-sm text-sage-600">
                Запишите первый приём пищи или создайте план питания на неделю с помощью ИИ.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/dashboard/log"
              className="flex-1 rounded-lg bg-bark-300 text-primary-foreground px-4 py-2.5 text-sm font-semibold text-center hover:bg-bark-400 transition-colors"
            >
              Добавить первый приём пищи
            </Link>
            <Link
              href="/dashboard/planner"
              className="flex-1 rounded-lg border border-sage-300 bg-white text-sage-700 px-4 py-2.5 text-sm font-medium text-center hover:bg-sage-50 transition-colors"
            >
              Сгенерировать план питания
            </Link>
          </div>
        </div>
      )}

      {/* Trial expiry banner */}
      {showTrialBanner && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClockIcon className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-900">
              {trialDaysLeft === 1
                ? 'Последний день пробного периода — не теряйте доступ к планировщику и рецептам.'
                : `Пробный период заканчивается через ${trialDaysLeft} дн. — оформите подписку, чтобы сохранить доступ.`}
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-900 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Подписаться
          </Link>
        </div>
      )}

      {/* Streak widget */}
      {currentStreak > 0 && (
        <div className="mb-6 rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            🔥
          </span>
          <div>
            <p className="text-sm font-semibold text-bark-300">
              {currentStreak}{' '}
              {currentStreak === 1
                ? 'день подряд'
                : currentStreak < 5
                  ? 'дня подряд'
                  : 'дней подряд'}
            </p>
            <p className="text-xs text-muted-foreground">Продолжайте — не прерывайте серию!</p>
          </div>
        </div>
      )}

      {/* Stat cards with progress vs target */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const pct =
            card.value !== null ? Math.min(100, Math.round((card.value / card.target) * 100)) : 0;
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
                  <p
                    className={`mt-1.5 text-2xl font-semibold ${over ? 'text-amber-600' : 'text-bark-300'}`}
                  >
                    {card.value}
                    <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                      {' '}
                      / {card.target} {card.unit}
                    </span>
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-parchment-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-amber-400' : 'bg-sage-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{pct}% от цели</p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-2xl font-semibold text-bark-300">
                    —
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {card.target} {card.unit}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Записей пока нет</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Water widget */}
      <div className="mb-6">
        <WaterWidget initialTotalMl={waterTotalMl} targetMl={waterTargetMl} />
      </div>

      {/* AI Insights card — appears when user has logged food today */}
      {hasEntries && (
        <div className="mb-6">
          <AIInsightsCard
            dayTotals={{
              current_kcal: Math.round(totals.calories),
              target_kcal: goals.daily_calorie_target,
              current_protein_g: Math.round(totals.protein_g),
              target_protein_g: goals.protein_target_g,
              current_carbs_g: Math.round(totals.carbs_g),
              target_carbs_g: goals.carbs_target_g,
              current_fat_g: Math.round(totals.fat_g),
              target_fat_g: goals.fat_target_g,
            }}
          />
        </div>
      )}

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
            <h2 className="font-semibold text-bark-300 text-sm">Записать приём пищи</h2>
          </div>
          <p className="text-xs text-muted-foreground">Отслеживайте блюда и макросы за сегодня.</p>
        </Link>

        <Link
          href="/dashboard/profile"
          className="group rounded-xl border border-parchment-200 bg-parchment-100 p-6 hover:border-bark-100 hover:bg-parchment-200 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="rounded-lg bg-sage-300 p-2">
              <ProfileIcon className="h-4 w-4 text-primary-foreground" />
            </span>
            <h2 className="font-semibold text-bark-300 text-sm">Профиль и цели</h2>
          </div>
          <p className="text-xs text-muted-foreground">Аккаунт и цели по нутриентам.</p>
        </Link>
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
