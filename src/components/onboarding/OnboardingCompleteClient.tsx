"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_STORAGE_KEY } from "@/components/onboarding/OnboardingWizard";
import { saveOnboarding, type OnboardingFormData } from "@/app/onboarding/actions";

/**
 * Runs once after authentication — reads localStorage onboarding data,
 * saves it to health_assessments, then redirects to /dashboard.
 * If no stored data: redirects to /dashboard directly (dashboard layout
 * will gate to /onboarding if the assessment is still missing).
 */
export function OnboardingCompleteClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showLongHint, setShowLongHint] = useState(false);
  useEffect(() => {
    if (status === "error") { setShowLongHint(false); return; }
    const t = setTimeout(() => setShowLongHint(true), 10000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    async function flush() {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      } catch {
        // localStorage unavailable (e.g. private browsing restriction)
      }

      if (!raw) {
        // Nothing to flush — go to dashboard; layout will redirect to /onboarding if needed
        router.replace("/dashboard");
        return;
      }

      setStatus("saving");
      try {
        const data = JSON.parse(raw) as OnboardingFormData;
        await saveOnboarding(data);
        // saveOnboarding redirects server-side on success, but as a server action
        // called from a client component it may not navigate automatically.
        // Clear localStorage and push manually as fallback.
        try {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        } catch {
          // ignore
        }
        router.replace("/dashboard");
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Что-то пошло не так.");
      }
    }

    flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-parchment-200 bg-parchment-100 p-8 text-center">
          <p className="text-sm font-medium text-bark-300 mb-2">Не удалось сохранить план</p>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <SpinnerIcon className="h-8 w-8 text-sage-300 mx-auto mb-4 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {status === "saving" ? "Сохраняем план…" : "Настраиваем аккаунт…"}
        </p>
        {showLongHint && (
          <p className="mt-2 text-sm text-muted-foreground animate-pulse">Ещё немного…</p>
        )}
      </div>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
