/**
 * POST /api/subscribe/cancel
 *
 * Cancels the user's premium subscription.
 * Sets status to "cancelled" in DB. User retains access until current_period_end.
 * A real implementation would also cancel the recurring payment with YooKassa.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub || (sub as { plan: string }).plan !== "premium" || (sub as { status: string }).status === "cancelled") {
    return NextResponse.json({ error: "No active premium subscription to cancel" }, { status: 400 });
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[subscribe/cancel] db error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Подписка отменена. Доступ сохранится до конца оплаченного периода.",
    accessUntil: (sub as { current_period_end: string | null }).current_period_end,
  });
}
