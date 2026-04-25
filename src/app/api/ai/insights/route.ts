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
import { getNutritionSummary, getWeightLogs } from "@/lib/nutrition/actions";
import {
  detectSafetyAlert,
  detectTrendWarning,
  detectPlateau,
} from "@/lib/nutrition/detection";

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

  // Build user profile from Supabase health_assessments + user_settings + user_goals
  const [{ data: assessment }, { data: settings }, { data: goals }] = await Promise.all([
    supabase
      .from("health_assessments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("user_settings")
      .select("tone_mode")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_goals")
      .select("daily_calorie_target, protein_target_g, fat_target_g")
      .eq("user_id", user.id)
      .single(),
  ]);

  const profile: UserProfile = {
    primary_goal: assessment?.primary_goal ?? "general_wellness",
    dietary_restrictions: assessment?.dietary_restrictions ?? [],
    allergens: assessment?.allergens ?? [],
    medical_conditions: assessment?.medical_conditions ?? [],
    eating_disorder_flag: assessment?.eating_disorder_flag ?? false,
    secondary_goals: assessment?.secondary_goals ?? [],
    tone_mode: (settings?.tone_mode as UserProfile["tone_mode"]) ?? "краткий",
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
        let alertPayload = payload as Parameters<typeof getSafetyAlert>[1];

        // Auto-detect if not explicitly provided
        if (!alertPayload.critical_deficiencies) {
          const nutrition = await getNutritionSummary(7);
          const detection = detectSafetyAlert(
            nutrition,
            goals?.protein_target_g ?? 100,
            goals?.fat_target_g ?? 70
          );

          if (detection.detected && detection.deficiencies.length > 0) {
            alertPayload = {
              window_days: detection.window_days,
              critical_deficiencies: detection.deficiencies,
            };
          } else {
            // No deficiencies detected, skip this insight
            return NextResponse.json({ insight: "" });
          }
        }

        result = await getSafetyAlert(profile, alertPayload);
        break;
      }
      case "goal_insight": {
        let goalPayload = payload as Record<string, unknown>;

        // Auto-detect plateau for weight loss if not provided
        if (profile.primary_goal === "weight_loss" && !goalPayload.plateau_detected) {
          const nutrition = await getNutritionSummary(7);
          const weights = await getWeightLogs(7);
          const plateau = detectPlateau(
            weights,
            nutrition,
            goals?.daily_calorie_target ?? 2000
          );
          goalPayload.plateau_detected = plateau.detected;
        }

        result = await getGoalInsight(profile, goalPayload);
        break;
      }
      case "trend_warning": {
        let trendPayload = payload as Parameters<typeof getTrendWarning>[1];

        // Auto-detect if not explicitly provided
        if (!trendPayload.trend_metric_name_ru) {
          const nutrition = await getNutritionSummary(7);
          const detection = detectTrendWarning(
            nutrition,
            goals?.daily_calorie_target ?? 2000,
            profile.primary_goal ?? "general_wellness"
          );

          if (detection.detected) {
            trendPayload = {
              trend_metric_name_ru: detection.trend_metric_name_ru,
              trend_category_ru: detection.trend_category_ru,
              trend_direction_ru: detection.trend_direction_ru,
              trend_magnitude_pct: detection.trend_magnitude_pct,
              contributing_factors_ru: detection.contributing_factors_ru,
            };
          } else {
            // No trends detected, skip this insight
            return NextResponse.json({ insight: "" });
          }
        }

        result = await getTrendWarning(profile, trendPayload);
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
