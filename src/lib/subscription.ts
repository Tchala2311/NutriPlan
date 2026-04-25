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
  is_founder: boolean;
  created_at: string;
  updated_at: string;
}

const TRIAL_DURATION_DAYS = 14;

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
      is_founder: false,
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
  // Founder accounts have permanent premium access — never check expiry
  if (sub.is_founder && sub.plan === "premium") return true;
  if (sub.plan !== "premium") return false;
  if (sub.status !== "active") return false;
  if (sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }
  return true;
}

/**
 * Returns true if user is within trial period (14 days from account creation).
 * Founders always have trial active.
 */
export async function isInTrial(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const createdAt = user.created_at ? new Date(user.created_at) : null;
  if (!createdAt) return false;

  const now = new Date();
  const trialEndMs = createdAt.getTime() + TRIAL_DURATION_DAYS * 86_400_000;
  return now.getTime() < trialEndMs;
}

/**
 * Check if user can access premium features.
 * True if: has active premium OR still in trial period OR is founder.
 */
export async function canAccessPremiumFeatures(): Promise<boolean> {
  const sub = await getUserSubscription();
  if (!sub) return false;

  // Founders always have access
  if (sub.is_founder) return true;

  // Active premium always has access
  if (sub.plan === "premium" && sub.status === "active") {
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
      return false; // Expired premium
    }
    return true;
  }

  // Free users: check if in trial
  if (sub.plan === "free") {
    return await isInTrial();
  }

  return false;
}
