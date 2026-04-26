import type { Metadata } from 'next';
import { createClient, getUser } from '@/lib/supabase/server';
import { getUserGoals } from '@/app/dashboard/profile/actions';
import { NutritionLogClient } from '@/components/nutrition/NutritionLogClient';
import { LOG_PAGE_SIZE } from '@/app/dashboard/log/constants';

export const metadata: Metadata = { title: 'Дневник питания — NutriPlan' };

export default async function NutritionLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().split('T')[0];
  const date = params.date ?? today;

  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();

  // Fetch one extra row to detect whether a "Load more" button is needed.
  const fetchLimit = LOG_PAGE_SIZE + 1;

  const [{ data: rawEntries }, goals, { data: assessment }] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('id, meal_type, food_name, calories, protein_g, carbs_g, fat_g, created_at')
      .eq('user_id', user!.id)
      .eq('logged_date', date)
      .order('created_at', { ascending: true })
      .limit(fetchLimit),
    getUserGoals(),
    supabase
      .from('health_assessments')
      .select(
        'dietary_restrictions, eating_disorder_ui_mode, eating_disorder_anorexia_restrictive, eating_disorder_binge, eating_disorder_orthorexia, primary_goal'
      )
      .eq('user_id', user!.id)
      .maybeSingle(),
  ]);

  const hasMore = (rawEntries ?? []).length > LOG_PAGE_SIZE;
  const entries = (rawEntries ?? []).slice(0, LOG_PAGE_SIZE);

  const userProfile = {
    primary_goal: goals.primary_goal ?? assessment?.primary_goal ?? null,
    dietary_restrictions: (assessment?.dietary_restrictions as string[] | undefined) ?? [],
    eating_disorder_flag: assessment?.eating_disorder_ui_mode ?? false,
    // TES-154: Granular eating disorder flags
    eating_disorder_anorexia_restrictive:
      (assessment?.eating_disorder_anorexia_restrictive as boolean | undefined) ?? false,
    eating_disorder_binge: (assessment?.eating_disorder_binge as boolean | undefined) ?? false,
    eating_disorder_orthorexia:
      (assessment?.eating_disorder_orthorexia as boolean | undefined) ?? false,
  };

  return (
    <NutritionLogClient
      date={date}
      entries={entries}
      goals={goals}
      userProfile={userProfile}
      hasMore={hasMore}
    />
  );
}
