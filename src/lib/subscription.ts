/**
 * Server-side subscription helpers.
 * Always call these in Server Components / Route Handlers — never in client code.
 */

import { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "premium";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "pending";

export interface Subscription {
  id: string;
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  yookassa_subscription_id: string | null;
  yookassa_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns the subscription row for the currently-authenticated user,
 * or a synthetic free-plan object if no row exists.
 */
export async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    // Return a virtual free-tier record — no row means free plan
    return {
      id: "",
      user_id: user.id,
      plan: "free",
      status: "active",
      current_period_end: null,
      yookassa_subscription_id: null,
      yookassa_payment_method_id: null,
      created_at: "",
      updated_at: "",
    };
  }

  return data as Subscription;
}

/**
 * Returns true when the user has an active premium subscription
 * that has not expired.
 */
export async function isPremium(): Promise<boolean> {
  const sub = await getUserSubscription();
  if (!sub) return false;
  if (sub.plan !== "premium") return false;
  if (sub.status !== "active") return false;
  if (sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }
  return true;
}
