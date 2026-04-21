"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  className?: string;
}

export function UpgradePrompt({ feature, description, className }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так. Попробуйте снова.");
        return;
      }
      window.location.href = data.confirmationUrl;
    } catch {
      setError("Не удалось подключиться к платёжной системе.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center",
        className
      )}
    >
      <LockIcon className="mx-auto h-10 w-10 text-parchment-300 mb-3" />
      <p className="font-display text-lg font-semibold text-bark-300">
        {feature} — только для Premium
      </p>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
        {description ??
          "Перейдите на Premium-план, чтобы разблокировать эту функцию."}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-bark-300 px-6 py-2.5 text-sm font-semibold text-white",
            "hover:bg-bark-400 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Перенаправление…
            </>
          ) : (
            <>
              <StarIcon className="h-4 w-4" />
              Перейти на Premium — 999 ₽/мес
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Безопасная оплата через ЮКасса
        </p>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
