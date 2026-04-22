"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const telegramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = telegramRef.current;
    if (!container || container.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute(
      "data-telegram-login",
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", "/api/auth/telegram/callback");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    container.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-lg bg-sage-50 border border-sage-100 px-4 py-6 text-center">
        <p className="text-sm font-medium text-sage-400">Проверьте почту</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Отправили ссылку для подтверждения на <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Электронная почта
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
          placeholder="Мин. 8 символов"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-foreground">
          Подтвердите пароль
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
          "hover:bg-primary/90 transition-colors disabled:opacity-60"
        )}
      >
        {loading ? "Создаём аккаунт…" : "Создать аккаунт"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-parchment-100 px-2 text-muted-foreground">или</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { window.location.href = "/api/auth/yandex"; }}
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors flex items-center justify-center gap-2"
        )}
      >
        <YandexIcon className="h-4 w-4" />
        Войти через Яндекс ID
      </button>

      {/* Telegram Login Widget — renders its own button */}
      <div ref={telegramRef} className="flex justify-center" />
    </form>
  );
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FC3F1D" aria-hidden="true">
      <path d="M2.04 12C2.04 6.48 6.5 2 12 2s9.96 4.48 9.96 10S17.5 22 12 22 2.04 17.52 2.04 12zm11.24 5.5h2.04V6.5H13.5c-2.6 0-3.98 1.31-3.98 3.25 0 1.67.82 2.6 2.24 3.52l-2.56 4.23H11.4l2.38-3.96.66.43c.55.35.84.7.84 1.37v2.16zm0-4.6l-.6-.38c-1.1-.7-1.6-1.3-1.6-2.4 0-1.1.77-1.82 2.2-1.82v4.6z" />
    </svg>
  );
}
