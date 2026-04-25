/**
 * Server actions for fetching nutrition analysis data.
 * These power the safety alert, trend warning, and plateau detection endpoints.
 */

import { createClient } from "@/lib/supabase/server";
import type { DailyNutrition } from "./detection";

/**
 * Fetch nutrition logs for a date range, aggregated by day.
 * Defaults to last 7 days when window is omitted.
 */
export async function getNutritionSummary(
  windowDays: number = 7
): Promise<DailyNutrition[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (windowDays - 1));
  const fromStr = fromDate.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const { data: entries, error } = await supabase
    .from("nutrition_logs")
    .select("logged_date, calories, protein_g, carbs_g, fat_g")
    .eq("user_id", user.id)
    .gte("logged_date", fromStr)
    .lte("logged_date", todayStr)
    .order("logged_date", { ascending: true });

  if (error || !entries) return [];

  // Aggregate by date
  const byDate = new Map<string, DailyNutrition>();
  for (const e of entries) {
    const d = e.logged_date as string;
    const cur = byDate.get(d) || {
      date: d,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };
    cur.calories += (e.calories as number) ?? 0;
    cur.protein_g += (e.protein_g as number) ?? 0;
    cur.carbs_g += (e.carbs_g as number) ?? 0;
    cur.fat_g += (e.fat_g as number) ?? 0;
    byDate.set(d, cur);
  }

  // Build array for all days in window (including empty days)
  const result: DailyNutrition[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const agg = byDate.get(dateStr);
    result.push(
      agg || {
        date: dateStr,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      }
    );
  }

  return result;
}

/**
 * Fetch weight logs for a date range.
 * Defaults to last 7 days when window is omitted.
 */
export async function getWeightLogs(windowDays: number = 7): Promise<
  Array<{
    date: string;
    weight_kg: number;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (windowDays - 1));
  const fromStr = fromDate.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const { data: logs, error } = await supabase
    .from("weight_logs")
    .select("logged_date, weight_kg")
    .eq("user_id", user.id)
    .gte("logged_date", fromStr)
    .lte("logged_date", todayStr)
    .order("logged_date", { ascending: true });

  if (error || !logs) return [];

  return logs.map((log) => ({
    date: log.logged_date as string,
    weight_kg: log.weight_kg as number,
  }));
}

/**
 * Log weight for today (or specified date).
 */
export async function logWeight(
  weight_kg: number,
  date?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const logged_date = date || new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("weight_logs").insert({
    user_id: user.id,
    logged_date,
    weight_kg,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
