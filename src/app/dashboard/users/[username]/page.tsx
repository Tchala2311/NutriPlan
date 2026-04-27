import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Профиль — NutriPlan' };

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  goal?: string;
  calorieTarget?: number;
  dietaryRestrictions: string[];
  allergens: string[];
  healthGoals: string[];
}

async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/api/users/@${username.replace('@', '')}`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.replace(/^@/, '');
  const profile = await fetchUserProfile(username);

  if (!profile) {
    notFound();
  }

  // Goal labels
  const goalLabels: Record<string, string> = {
    weight_loss: 'Снижение веса',
    muscle_gain: 'Набор мышц',
    maintenance: 'Поддержание веса',
    disease_management: 'Управление заболеванием',
    general_wellness: 'Общее здоровье',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage-200 text-bark-300 font-bold text-lg">
          {(profile.displayName || profile.username || '?')
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-bark-300 truncate">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
        </div>
      </div>

      {/* Goal card */}
      {profile.goal && (
        <div className="rounded-xl border border-parchment-200 bg-parchment-50 p-4">
          <p className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-2">
            Основная цель
          </p>
          <p className="text-sm font-medium text-bark-300">
            {goalLabels[profile.goal] || profile.goal}
          </p>
          {profile.calorieTarget && (
            <p className="text-xs text-muted-foreground mt-2">
              Ежедневный лимит калорий: {profile.calorieTarget} ккал
            </p>
          )}
        </div>
      )}

      {/* Dietary restrictions */}
      {profile.dietaryRestrictions.length > 0 && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <p className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-3">
            Пищевые ограничения
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.dietaryRestrictions.map((restriction) => (
              <span
                key={restriction}
                className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
              >
                {restriction}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergens */}
      {profile.allergens.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
            Аллергены
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.allergens.map((allergen) => (
              <span
                key={allergen}
                className="inline-flex items-center rounded-full bg-white border border-red-200 px-3 py-1 text-xs font-medium text-red-700"
              >
                ⚠ {allergen}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Health goals */}
      {profile.healthGoals.length > 0 && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <p className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-3">
            Здоровье
          </p>
          <div className="space-y-2">
            {profile.healthGoals.map((goal) => (
              <p key={goal} className="text-sm text-bark-300">
                • {goal}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Empty state message */}
      {!profile.goal && !profile.dietaryRestrictions.length && !profile.allergens.length && !profile.healthGoals.length && (
        <div className="rounded-xl border border-dashed border-parchment-200 bg-parchment-50 py-12 px-6 text-center">
          <p className="text-sm text-bark-200">
            Пользователь еще не заполнил профиль
          </p>
        </div>
      )}
    </div>
  );
}
