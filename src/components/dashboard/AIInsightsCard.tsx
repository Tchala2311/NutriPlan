'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DayTotals {
  current_kcal: number;
  target_kcal: number;
  current_protein_g: number;
  target_protein_g: number;
  current_carbs_g: number;
  target_carbs_g: number;
  current_fat_g: number;
  target_fat_g: number;
}

interface AIInsightsCardProps {
  dayTotals: DayTotals;
}

type InsightType = 'safety_alert' | 'goal_insight' | 'trend_warning' | 'optimisation_tip';

const INSIGHT_LABELS: Record<InsightType, string> = {
  safety_alert: 'Предупреждение',
  goal_insight: 'Прогресс к цели',
  trend_warning: 'Тренд',
  optimisation_tip: 'Совет',
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  safety_alert: 'border-destructive/30 bg-destructive/5',
  goal_insight: 'border-sage-200 bg-sage-50',
  trend_warning: 'border-amber-200 bg-amber-50',
  optimisation_tip: 'border-parchment-200 bg-parchment-100',
};

const INSIGHT_BADGE: Record<InsightType, string> = {
  safety_alert: 'bg-destructive/10 text-destructive',
  goal_insight: 'bg-sage-100 text-sage-700',
  trend_warning: 'bg-amber-100 text-amber-700',
  optimisation_tip: 'bg-parchment-200 text-bark-200',
};

export function AIInsightsCard({ dayTotals }: AIInsightsCardProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [type, setType] = useState<InsightType>('optimisation_tip');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [longRunning, setLongRunning] = useState(false);
  useEffect(() => {
    if (!loading) {
      setLongRunning(false);
      return;
    }
    const t = setTimeout(() => setLongRunning(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    // Only fetch once and only if user has logged some food today
    if (fetched || dayTotals.current_kcal === 0) return;

    setLoading(true);
    const controller = new AbortController();

    // Priority: safety_alert > trend_warning > goal_insight > optimisation_tip
    // (safety_alert / trend_warning auto-detect from server-side nutrition data)
    const candidates: Array<{ type: InsightType; payload: Record<string, unknown> }> = [
      { type: 'safety_alert', payload: {} }, // Auto-detect on server
      { type: 'trend_warning', payload: {} }, // Auto-detect on server
      { type: 'goal_insight', payload: { dayTotals } },
      {
        type: 'optimisation_tip',
        payload: {
          tip_subtype_ru: 'общий баланс нутриентов',
          tip_data: `Сегодня: ${dayTotals.current_kcal} ккал из ${dayTotals.target_kcal} ккал. Белки ${dayTotals.current_protein_g}г/${dayTotals.target_protein_g}г, углеводы ${dayTotals.current_carbs_g}г/${dayTotals.target_carbs_g}г, жиры ${dayTotals.current_fat_g}г/${dayTotals.target_fat_g}г.`,
        },
      },
    ];

    (async () => {
      for (const { type: t, payload } of candidates) {
        try {
          const res = await fetch('/api/ai/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: t, ...payload }),
            signal: controller.signal,
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { insight?: string; message?: string };
          const text = data.insight ?? data.message;
          if (text && text.trim()) {
            setInsight(text.trim());
            setType(t);
            break;
          }
        } catch {
          break;
        }
      }
      setLoading(false);
      setFetched(true);
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed || (!loading && !insight)) return null;

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4 transition-all',
        loading ? 'border-parchment-200 bg-parchment-100 opacity-70' : INSIGHT_COLORS[type]
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <SparklesIcon
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              type === 'safety_alert'
                ? 'text-destructive'
                : type === 'trend_warning'
                  ? 'text-amber-500'
                  : 'text-sage-500'
            )}
          />
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <SpinnerIcon className="h-3.5 w-3.5 text-sage-500 animate-spin shrink-0" />
                  <p className="text-sm text-muted-foreground">Анализируем ваше питание…</p>
                </div>
                {longRunning && (
                  <p className="text-xs text-muted-foreground animate-pulse pl-5">Ещё немного…</p>
                )}
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1.5',
                    INSIGHT_BADGE[type]
                  )}
                >
                  {INSIGHT_LABELS[type]}
                </span>
                <p className="text-sm text-bark-300 leading-relaxed">{insight}</p>
              </>
            )}
          </div>
        </div>
        {!loading && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-bark-300 transition-colors"
            aria-label="Скрыть"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
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
        d="M5 3v4M3 5h4M6.343 17.657l-2.829 2.829M5.172 14.172l-2.829 2.829M19 3v4M17 5h4M17.657 17.657l2.829 2.829M18.828 14.172l2.829 2.829M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
