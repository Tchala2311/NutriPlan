"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "yandex") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
          Email
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
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-amber-300 hover:text-amber-400 hover:underline underline-offset-4"
          >
            Forgot password?
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
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-parchment-100 px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleOAuth("google")}
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors flex items-center justify-center gap-2"
        )}
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("yandex")}
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors flex items-center justify-center gap-2"
        )}
      >
        <YandexIcon className="h-4 w-4" />
        Continue with Yandex ID
      </button>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FC3F1D" aria-hidden="true">
      <path d="M2.04 12C2.04 6.48 6.5 2 12 2s9.96 4.48 9.96 10S17.5 22 12 22 2.04 17.52 2.04 12zm11.24 5.5h2.04V6.5H13.5c-2.6 0-3.98 1.31-3.98 3.25 0 1.67.82 2.6 2.24 3.52l-2.56 4.23H11.4l2.38-3.96.66.43c.55.35.84.7.84 1.37v2.16zm0-4.6l-.6-.38c-1.1-.7-1.6-1.3-1.6-2.4 0-1.1.77-1.82 2.2-1.82v4.6z" />
    </svg>
  );
}
