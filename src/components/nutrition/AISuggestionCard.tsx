"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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

interface UserProfileMin {
  primary_goal?: string | null;
  dietary_restrictions?: string[];
  eating_disorder_flag?: boolean;
  tone_mode?: string;
}

interface AISuggestionCardProps {
  dayTotals: DayTotals;
  userProfile: UserProfileMin;
  /** Trigger key — increment to re-fetch (e.g. after each new food log) */
  triggerKey: number;
}

export function AISuggestionCard({ dayTotals, userProfile, triggerKey }: AISuggestionCardProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [longRunning, setLongRunning] = useState(false);
  useEffect(() => {
    if (!loading) { setLongRunning(false); return; }
    const t = setTimeout(() => setLongRunning(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    // Don't fetch if no entries logged yet
    if (dayTotals.current_kcal === 0) return;

    setDismissed(false);
    setSuggestion(null);
    setLoading(true);

    const controller = new AbortController();

    fetch("/api/ai/food-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayTotals, userProfile }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { suggestion?: string }) => {
        if (data.suggestion && data.suggestion.trim()) {
          setSuggestion(data.suggestion.trim());
        }
      })
      .catch(() => {
        // Silently ignore — suggestions are non-critical
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  if (dismissed || (!loading && !suggestion)) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 transition-all",
        loading && "opacity-60"
      )}
      role="status"
      aria-live="polite"
    >
      <SparklesIcon className="h-4 w-4 text-sage-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <SpinnerIcon className="h-3.5 w-3.5 text-sage-500 animate-spin shrink-0" />
              <p className="text-sm text-muted-foreground">Получаем совет ИИ…</p>
            </div>
            {longRunning && (
              <p className="text-xs text-muted-foreground animate-pulse pl-5">Ещё немного…</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-bark-300">{suggestion}</p>
        )}
      </div>
      {!loading && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-bark-300 transition-colors"
          aria-label="Скрыть совет"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6.343 17.657l-2.829 2.829M5.172 14.172l-2.829 2.829M19 3v4M17 5h4M17.657 17.657l2.829 2.829M18.828 14.172l2.829 2.829M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
