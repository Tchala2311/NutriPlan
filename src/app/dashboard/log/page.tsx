import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NutritionLogClient } from "@/components/nutrition/NutritionLogClient";

export const metadata: Metadata = { title: "Nutrition Log — NutriPlan" };

export default async function NutritionLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = params.date ?? today;

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("nutrition_logs")
    .select("id, meal_type, food_name, calories, protein_g, carbs_g, fat_g, created_at")
    .eq("logged_date", date)
    .order("created_at", { ascending: true });

  return <NutritionLogClient date={date} entries={entries ?? []} />;
}
