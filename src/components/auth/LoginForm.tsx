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

  function handleOAuth(provider: "yandex" | "vk") {
    window.location.href = `/api/auth/${provider}`;
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
        onClick={() => handleOAuth("yandex")}
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors flex items-center justify-center gap-2"
        )}
      >
        <YandexIcon className="h-4 w-4" />
        Continue with Yandex ID
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("vk")}
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors flex items-center justify-center gap-2"
        )}
      >
        <VKIcon className="h-4 w-4" />
        Continue with VK
      </button>
    </form>
  );
}

function VKIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0077FF" aria-hidden="true">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.023 11.488 4.400 9.37 4.400 8.953c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.715c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.254-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.745-.576.745z" />
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
