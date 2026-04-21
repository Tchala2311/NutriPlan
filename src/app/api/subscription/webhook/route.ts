/**
 * POST /api/subscription/webhook
 *
 * YooKassa webhook handler.
 * YooKassa sends events as JSON POST with IP whitelisting (configured in YooKassa dashboard).
 * We verify the event is genuine by re-fetching the payment from YooKassa API.
 *
 * Supported events:
 *   payment.succeeded  → activate/renew premium subscription
 *   payment.canceled   → mark subscription past_due
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPayment, type YooKassaWebhookEvent } from "@/lib/yookassa/client";

const SUBSCRIPTION_PERIOD_DAYS = 30;

export async function POST(req: Request) {
  let event: YooKassaWebhookEvent;

  try {
    event = (await req.json()) as YooKassaWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = event.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // Re-fetch from YooKassa to verify authenticity
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.error("[webhook] Failed to fetch payment from YooKassa:", err);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }

  const userId = payment.metadata?.user_id;
  if (!userId) {
    // Not a subscription payment — ignore
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();

  if (event.event === "payment.succeeded" && payment.status === "succeeded") {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + SUBSCRIPTION_PERIOD_DAYS);

    const paymentMethodId = payment.payment_method?.saved
      ? payment.payment_method.id
      : undefined;

    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        current_period_end: periodEnd.toISOString(),
        yookassa_subscription_id: payment.id,
        ...(paymentMethodId ? { yookassa_payment_method_id: paymentMethodId } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log(`[webhook] Premium activated for user ${userId} until ${periodEnd.toISOString()}`);
  } else if (event.event === "payment.canceled") {
    await supabase
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    console.log(`[webhook] Payment canceled for user ${userId}`);
  }

  return NextResponse.json({ ok: true });
}
