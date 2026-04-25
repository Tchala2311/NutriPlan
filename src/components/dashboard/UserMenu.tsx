"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface UserMenuProps {
  email: string;
  avatarUrl?: string | null;
  firstName?: string | null;
}

export function UserMenu({ email, avatarUrl, firstName }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayName = firstName?.trim() || email;
  const initials = firstName?.trim()
    ? firstName.trim().slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          "hover:bg-bark-50/40 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={email}
            className="h-8 w-8 rounded-full object-cover border border-parchment-200"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bark-200 text-xs font-semibold text-bark-500 border border-parchment-200">
            {initials}
          </span>
        )}
        <span className="hidden sm:block max-w-[140px] truncate text-sm text-bark-300">
          {displayName}
        </span>
        <ChevronIcon className={cn("h-3.5 w-3.5 text-bark-200 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute right-0 z-20 mt-1 w-48 rounded-xl border border-parchment-200",
              "bg-parchment-50 shadow-md py-1"
            )}
          >
            <div className="px-3 py-2 border-b border-parchment-200">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className={cn(
                "w-full text-left px-3 py-2 text-sm text-bark-300 hover:bg-parchment-100 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? "Выходим…" : "Выйти"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
