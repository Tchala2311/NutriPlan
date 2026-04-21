/**
 * POST /api/ai/insights
 *
 * Returns the highest-priority AI insight for the current user based on their
 * nutrition data and health profile. Priority queue:
 *   1. Safety alert (critical nutrient deficiency)
 *   2. Goal insight (weight loss / muscle gain / disease management)
 *   3. Trend warning (7-day negative trend)
 *   4. Optimisation tip (low-priority improvement)
 *
 * Body: { type: "daily_analysis" | "safety_alert" | "goal_insight" | "trend_warning" | "optimisation_tip" | "meal_substitution", ...payload }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyAnalysis,
  getSafetyAlert,
  getGoalInsight,
  getTrendWarning,
  getOptimisationTip,
  getMealSubstitution,
  UserProfile,
} from "@/lib/gigachat/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, ...payload } = body as { type: string; [k: string]: unknown };

  // Build user profile from Supabase health_assessments
  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const profile: UserProfile = {
    primary_goal: assessment?.primary_goal ?? "general_wellness",
    dietary_restrictions: assessment?.dietary_restrictions ?? [],
    allergens: assessment?.allergens ?? [],
    medical_conditions: assessment?.medical_conditions ?? [],
    eating_disorder_flag: assessment?.eating_disorder_flag ?? false,
    secondary_goals: assessment?.secondary_goals ?? [],
    tone_mode: "краткий",
  };

  try {
    let result: string;

    switch (type) {
      case "daily_analysis": {
        result = await getDailyAnalysis(
          profile,
          payload as Parameters<typeof getDailyAnalysis>[1]
        );
        break;
      }
      case "safety_alert": {
        result = await getSafetyAlert(
          profile,
          payload as Parameters<typeof getSafetyAlert>[1]
        );
        break;
      }
      case "goal_insight": {
        result = await getGoalInsight(
          profile,
          payload as Record<string, unknown>
        );
        break;
      }
      case "trend_warning": {
        result = await getTrendWarning(
          profile,
          payload as Parameters<typeof getTrendWarning>[1]
        );
        break;
      }
      case "optimisation_tip": {
        const { tip_subtype_ru, tip_data } = payload as {
          tip_subtype_ru: string;
          tip_data: string;
        };
        result = await getOptimisationTip(profile, tip_subtype_ru, tip_data);
        break;
      }
      case "meal_substitution": {
        result = await getMealSubstitution(
          profile,
          payload as Parameters<typeof getMealSubstitution>[1]
        );
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown insight type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ insight: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
