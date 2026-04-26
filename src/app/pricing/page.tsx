import type { Metadata } from 'next';
import Link from 'next/link';
import { getUserSubscription } from '@/lib/subscription';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';

export const metadata: Metadata = {
  title: 'Тарифы — NutriPlan',
  description: 'Выберите план NutriPlan: Free или Premium',
};

const FREE_FEATURES = [
  'Ежедневный дневник питания',
  'Подсчёт КБЖУ',
  'Цели по нутриентам',
  'История за 7 дней',
];

const PREMIUM_FEATURES = [
  'Всё из Free-плана',
  'Планировщик питания на неделю',
  'База рецептов с нутриентами',
  'AI-рекомендации по питанию',
  'История без ограничений',
  'Приоритетная поддержка',
];

export default async function PricingPage() {
  const sub = await getUserSubscription();
  const isPremium = sub?.plan === 'premium' && sub?.status === 'active';

  return (
    <div className="min-h-screen bg-cream-100 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold tracking-widest uppercase text-sage-400 mb-3">
            Тарифы
          </p>
          <h1 className="font-display text-4xl font-bold text-bark-300 mb-4">
            Простые, прозрачные цены
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Начните бесплатно. Перейдите на Premium, когда будете готовы раскрыть весь потенциал
            своего питания.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                Free
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-bark-300">0 ₽</span>
                <span className="text-muted-foreground text-sm">/ навсегда</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-bark-200">
                  <CheckIcon className="h-4 w-4 text-sage-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard"
              className="block w-full rounded-lg border border-parchment-300 px-4 py-2.5 text-center text-sm font-semibold text-bark-300 hover:bg-parchment-200 transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-bark-300 bg-bark-300 p-8 relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 rounded-full bg-sage-400 px-3 py-1 text-xs font-semibold text-white">
              Рекомендуем
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-parchment-300 mb-2">
                Premium
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-parchment-100">999 ₽</span>
                <span className="text-parchment-300 text-sm">/ месяц</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-parchment-200">
                  <CheckIcon className="h-4 w-4 text-sage-300 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="block w-full rounded-lg bg-sage-400 px-4 py-2.5 text-center text-sm font-semibold text-white">
                ✓ У вас уже Premium
              </div>
            ) : (
              <UpgradeButton />
            )}

            <p className="mt-3 text-center text-xs text-parchment-300">
              Безопасная оплата через ЮКасса. Отмена в любой момент.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-bark-300 transition-colors"
          >
            ← Назад
          </Link>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
