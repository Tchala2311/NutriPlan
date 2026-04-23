"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials") || message.includes("invalid_credentials"))
    return "Неверный email или пароль.";
  if (message.includes("Email not confirmed"))
    return "__email_not_confirmed__";
  if (message.includes("Too many requests"))
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  if (message.includes("User not found"))
    return "Аккаунт с таким email не найден. Зарегистрируйтесь.";
  if (message.includes("over_email_send_rate_limit"))
    return "Слишком много писем отправлено. Попробуйте позже.";
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
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
    setLoading(true);
    setError(null);
    setEmailNotConfirmed(false);
    setResendSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const translated = translateAuthError(error.message);
      if (translated === "__email_not_confirmed__") {
        setEmailNotConfirmed(true);
        setError(null);
      } else {
        setError(translated);
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResendConfirmation() {
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    setResendSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {emailNotConfirmed && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-2">
          <p className="font-medium">Email не подтверждён</p>
          <p>Проверьте почту и перейдите по ссылке из письма. Если письмо не пришло — отправим снова.</p>
          {resendSuccess ? (
            <p className="text-green-700 font-medium">Письмо отправлено! Проверьте почту.</p>
          ) : (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              className="underline underline-offset-2 font-medium disabled:opacity-50"
            >
              {resendLoading ? "Отправляем…" : "Отправить письмо повторно"}
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Электронная почта
        </label>
        <p className="text-xs text-muted-foreground">Используйте адрес электронной почты, а не имя пользователя</p>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Пароль
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-amber-300 hover:text-amber-400 hover:underline underline-offset-4"
          >
            Забыли пароль?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
          "hover:bg-primary/90 transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {loading ? "Входим…" : "Войти"}
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
