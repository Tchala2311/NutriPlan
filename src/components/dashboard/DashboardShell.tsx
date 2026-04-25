"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Главная",         href: "/dashboard",          icon: HomeIcon    },
  { label: "Дневник питания", href: "/dashboard/log",      icon: LogIcon     },
  { label: "Планировщик",    href: "/dashboard/planner",  icon: PlannerIcon },
  { label: "Рецепты",        href: "/dashboard/recipes",  icon: RecipesIcon },
  { label: "Чат с ИИ",       href: "/dashboard/chat",     icon: ChatIcon    },
  { label: "Профиль и цели", href: "/dashboard/profile",  icon: ProfileIcon },
  { label: "Настройки",      href: "/dashboard/settings", icon: SettingsIcon },
];

// 5 primary tabs for the mobile bottom nav — Рецепты and Настройки accessible via sidebar
const BOTTOM_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0], // Главная
  NAV_ITEMS[1], // Дневник питания
  NAV_ITEMS[2], // Планировщик
  NAV_ITEMS[4], // Чат с ИИ
  NAV_ITEMS[5], // Профиль и цели
];

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  userAvatarUrl?: string | null;
  userFirstName?: string | null;
}

export function DashboardShell({ children, userEmail, userAvatarUrl, userFirstName }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      {/* ── Mobile overlay (for hamburger / sidebar on lg+) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-bark-500/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop lg+ always visible; mobile: slide-in via hamburger) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-parchment-100 border-r border-parchment-200",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-parchment-200">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <LeafIcon className="h-6 w-6 text-sage-300" />
            <span className="font-display text-xl font-bold text-bark-300">NutriPlan</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-bark-300 text-primary-foreground"
                    : "text-bark-200 hover:bg-parchment-200 hover:text-bark-300"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-parchment-200 px-3 py-3">
          <p className="px-3 text-xs text-muted-foreground">NutriPlan — ИИ-питание</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-parchment-200 bg-parchment-50/80 backdrop-blur-sm px-4 lg:px-6">
          {/* Hamburger — only shown on desktop to toggle sidebar (mobile uses bottom nav) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "rounded-lg p-2 text-bark-200 hover:bg-parchment-200 hover:text-bark-300 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "hidden lg:hidden" // sidebar always visible on lg; bottom nav handles mobile
            )}
            aria-label="Открыть меню"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {/* Brand — visible on mobile (sidebar is hidden); hidden on desktop (sidebar shows brand) */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <LeafIcon className="h-5 w-5 text-sage-300" />
            <span className="font-display text-lg font-bold text-bark-300">NutriPlan</span>
          </Link>

          {/* Spacer so UserMenu stays right on desktop */}
          <div className="hidden lg:block flex-1" />

          <div className="ml-auto lg:ml-0">
            <UserMenu email={userEmail} avatarUrl={userAvatarUrl} firstName={userFirstName} />
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the bottom nav */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-[5.5rem] lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-parchment-100/95 backdrop-blur-md border-t border-parchment-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Основная навигация"
      >
        <div className="flex items-stretch justify-around">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] px-1 py-2",
                  "text-[10px] font-medium leading-none transition-colors",
                  active ? "text-bark-300" : "text-stone-400"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-150",
                    active && "scale-110"
                  )}
                />
                <span className="truncate max-w-[60px] text-center">
                  {/* Shorten labels for the compact bottom nav */}
                  {item.label === "Дневник питания" ? "Дневник" :
                   item.label === "Профиль и цели"  ? "Профиль" :
                   item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── Icons ── */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m0 0h4m-4 0H7" />
    </svg>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function PlannerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function RecipesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
