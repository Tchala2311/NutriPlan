/**
 * POST /api/referrals/process-rewards
 *
 * Process pending referral rewards (grant free month to referrer).
 * Called by webhook after successful payment confirmation.
 * Expects: { referred_user_id } - the user who just subscribed
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { referred_user_id } = await req.json();

    if (!referred_user_id) {
      return NextResponse.json(
        { error: "Missing referred_user_id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find completed referral for this user
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_user_id", referred_user_id)
      .eq("status", "completed")
      .single();

    if (referralError || !referral) {
      // No referral or not completed, nothing to do
      return NextResponse.json({ success: true, message: "No referral found" });
    }

    // Get referrer's current subscription
    const { data: referrerSub, error: subError } = await supabase
      .from("subscriptions")
      .select("id, current_period_end")
      .eq("user_id", referral.referrer_id)
      .single();

    if (subError || !referrerSub) {
      // Referrer has no subscription, can't grant reward
      return NextResponse.json({
        success: true,
        message: "Referrer has no active subscription",
      });
    }

    // Extend period by 30 days (1 free month)
    const currentEndDate = referrerSub.current_period_end
      ? new Date(referrerSub.current_period_end)
      : new Date();
    const newEndDate = new Date(
      currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Update subscription with extended period
    await supabase
      .from("subscriptions")
      .update({
        current_period_end: newEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrerSub.id);

    // Mark referral as rewarded
    await supabase
      .from("referrals")
      .update({
        status: "rewarded",
        rewarded_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    return NextResponse.json({
      success: true,
      message: "Referral reward processed",
    });
  } catch (err) {
    console.error("[referrals/process-rewards] Error:", err);
    return NextResponse.json(
      { error: "Failed to process referral rewards" },
      { status: 500 }
    );
  }
}
