"use client";

import { useState } from "react";

interface WaterWidgetProps {
  initialTotalMl: number;
  targetMl: number;
}

const QUICK_AMOUNTS = [200, 350, 500] as const;

export function WaterWidget({ initialTotalMl, targetMl }: WaterWidgetProps) {
  const [totalMl, setTotalMl] = useState(initialTotalMl);
  const [customMl, setCustomMl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.min(100, Math.round((totalMl / targetMl) * 100));
  const over = totalMl > targetMl;

  async function logWater(ml: number) {
    if (ml <= 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml: ml }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      setTotalMl((prev) => prev + ml);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log water.");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ml = Math.round(Number(customMl));
    if (!ml || ml <= 0) return;
    logWater(ml);
    setCustomMl("");
  }

  const glassCount = Math.round(totalMl / 250);

  return (
    <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded-lg bg-sky-500 p-1.5">
          <WaterDropIcon className="h-4 w-4 text-white" />
        </span>
        <h2 className="font-semibold text-bark-300 text-sm">Water intake</h2>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className={`text-2xl font-semibold ${over ? "text-sky-600" : "text-bark-300"}`}>
            {totalMl}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground"> / {targetMl} ml</span>
          </span>
          <span className="text-xs text-muted-foreground">{glassCount} glass{glassCount !== 1 ? "es" : ""}</span>
        </div>
        <div className="h-1.5 rounded-full bg-parchment-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${over ? "bg-sky-400" : "bg-sky-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{pct}% of daily target</p>
      </div>

      {/* Quick-log buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => logWater(ml)}
            disabled={loading}
            className="rounded-lg border border-parchment-200 bg-white px-3 py-1.5 text-xs font-medium text-bark-300 hover:bg-parchment-200 disabled:opacity-50 transition-colors"
          >
            +{ml} ml
          </button>
        ))}

        {/* Custom amount */}
        <form onSubmit={handleCustomSubmit} className="flex gap-1">
          <input
            type="number"
            min="1"
            max="2000"
            step="1"
            placeholder="ml"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            className="w-16 rounded-lg border border-parchment-200 bg-white px-2 py-1.5 text-xs text-bark-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || !customMl}
            className="rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            +
          </button>
        </form>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function WaterDropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C12 2 4 10.4 4 15a8 8 0 0016 0C20 10.4 12 2 12 2z" />
    </svg>
  );
}
