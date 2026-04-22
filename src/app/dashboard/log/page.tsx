import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserGoals } from "@/app/dashboard/profile/actions";
import { NutritionLogClient } from "@/components/nutrition/NutritionLogClient";

export const metadata: Metadata = { title: "Дневник питания — NutriPlan" };

export default async function NutritionLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = params.date ?? today;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: entries }, goals, { data: assessment }] = await Promise.all([
    supabase
      .from("nutrition_logs")
      .select("id, meal_type, food_name, calories, protein_g, carbs_g, fat_g, created_at")
      .eq("logged_date", date)
      .order("created_at", { ascending: true }),
    getUserGoals(),
    supabase
      .from("health_assessments")
      .select("dietary_restrictions, eating_disorder_ui_mode, primary_goal")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const userProfile = {
    primary_goal: goals.primary_goal ?? assessment?.primary_goal ?? null,
    dietary_restrictions: (assessment?.dietary_restrictions as string[] | undefined) ?? [],
    eating_disorder_flag: assessment?.eating_disorder_ui_mode ?? false,
  };

  return (
    <NutritionLogClient
      date={date}
      entries={entries ?? []}
      goals={goals}
      userProfile={userProfile}
    />
  );
}
