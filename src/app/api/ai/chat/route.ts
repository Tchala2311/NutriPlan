/**
 * POST /api/ai/chat
 *
 * Prompt 8: Free-form nutrition Q&A via GigaChat.
 * Body: { message: string }
 * Returns: { answer: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFreeAnswer, UserProfile } from "@/lib/gigachat/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let message: string;
  try {
    const body = await req.json();
    message = body.message;
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("primary_goal, dietary_restrictions, allergens, medical_conditions, eating_disorder_flag, eating_disorder_anorexia_restrictive, eating_disorder_binge, eating_disorder_orthorexia, secondary_goals, is_pregnant, pregnancy_trimester, is_breastfeeding")
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
    // TES-154: Granular eating disorder flags
    eating_disorder_anorexia_restrictive: assessment?.eating_disorder_anorexia_restrictive ?? false,
    eating_disorder_binge: assessment?.eating_disorder_binge ?? false,
    eating_disorder_orthorexia: assessment?.eating_disorder_orthorexia ?? false,
    secondary_goals: assessment?.secondary_goals ?? [],
    tone_mode: "подробный",
    // TES-156: Pregnancy / breastfeeding safety
    is_pregnant:         assessment?.is_pregnant         ?? false,
    pregnancy_trimester: (assessment?.pregnancy_trimester ?? undefined) as 1 | 2 | 3 | undefined,
    is_breastfeeding:    assessment?.is_breastfeeding    ?? false,
  };

  try {
    const answer = await getFreeAnswer(profile, message.trim());
    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
