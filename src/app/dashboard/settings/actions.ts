"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationPrefs = {
  meal_reminder_time: string | null;       // "HH:MM" or null
  water_reminder_interval_min: number | null; // minutes or null
  ai_suggestion_timing: "off" | "after_logging" | "daily_digest";
};

export type UserSettings = {
  units: "metric" | "imperial";
  language: "ru" | "en";
  notification_prefs: NotificationPrefs;
  training_days: number[]; // catalog day indices: 0=Mon … 6=Sun
  budget_preference: "low" | "moderate" | "high";
  dietary_restrictions: string[];
  allergens: string[];
};

const DEFAULT_SETTINGS: UserSettings = {
  units: "metric",
  language: "ru",
  notification_prefs: {
    meal_reminder_time: null,
    water_reminder_interval_min: null,
    ai_suggestion_timing: "off",
  },
  training_days: [0, 2, 4, 5], // Mon, Wed, Fri, Sat
  budget_preference: "moderate",
  dietary_restrictions: [],
  allergens: [],
};

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [settingsResult, healthResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("units, language, notification_prefs, training_days, budget_preference")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("health_assessments")
      .select("dietary_restrictions, allergens")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const data = settingsResult.data;
  const health = healthResult.data;

  if (!data) {
    return {
      ...DEFAULT_SETTINGS,
      dietary_restrictions: (health?.dietary_restrictions as string[]) ?? DEFAULT_SETTINGS.dietary_restrictions,
      allergens: (health?.allergens as string[]) ?? DEFAULT_SETTINGS.allergens,
    };
  }

  return {
    units: (data.units as UserSettings["units"]) ?? DEFAULT_SETTINGS.units,
    language: (data.language as UserSettings["language"]) ?? DEFAULT_SETTINGS.language,
    notification_prefs: {
      ...DEFAULT_SETTINGS.notification_prefs,
      ...(data.notification_prefs as Partial<NotificationPrefs>),
    },
    training_days: Array.isArray(data.training_days) && data.training_days.length > 0
      ? (data.training_days as number[])
      : DEFAULT_SETTINGS.training_days,
    budget_preference: (data.budget_preference as UserSettings["budget_preference"]) ?? DEFAULT_SETTINGS.budget_preference,
    dietary_restrictions: (health?.dietary_restrictions as string[]) ?? DEFAULT_SETTINGS.dietary_restrictions,
    allergens: (health?.allergens as string[]) ?? DEFAULT_SETTINGS.allergens,
  };
}

export async function saveSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const mealTime = (formData.get("meal_reminder_time") as string) || null;
  const waterInterval = formData.get("water_reminder_interval_min");

  // Extract training days from checkboxes
  const trainingDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (formData.has(`training_day_${i}`)) {
      trainingDays.push(i);
    }
  }

  // Extract dietary restrictions and allergens from checkboxes
  const dietaryRestrictions: string[] = [];
  const allergens: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("dietary_restriction_")) {
      dietaryRestrictions.push(value as string);
    } else if (key.startsWith("allergen_")) {
      allergens.push(value as string);
    }
  }

  const settings = {
    user_id: user.id,
    units: (formData.get("units") as string) || "metric",
    language: (formData.get("language") as string) || "ru",
    notification_prefs: {
      meal_reminder_time: mealTime || null,
      water_reminder_interval_min: waterInterval ? Number(waterInterval) : null,
      ai_suggestion_timing:
        (formData.get("ai_suggestion_timing") as string) || "off",
    },
    training_days: trainingDays.length > 0 ? trainingDays : [0, 2, 4, 5],
    budget_preference: (formData.get("budget_preference") as string) || "moderate",
  };

  const healthSettings = {
    user_id: user.id,
    dietary_restrictions: dietaryRestrictions,
    allergens: allergens,
  };

  // Upsert user_settings: check if exists, then update or insert
  const { data: existing, error: checkError } = await supabase
    .from("user_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message);

  let settingsError;
  if (existing) {
    // Row exists, update it
    const result = await supabase
      .from("user_settings")
      .update(settings)
      .eq("id", existing.id);
    settingsError = result.error;
  } else {
    // Row doesn't exist, insert new row
    const result = await supabase
      .from("user_settings")
      .insert([settings]);
    settingsError = result.error;
  }

  if (settingsError) throw new Error(settingsError.message);

  // Update health_assessments
  const { error: healthError } = await supabase
    .from("health_assessments")
    .update(healthSettings)
    .eq("user_id", user.id);

  if (healthError) throw new Error(healthError.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planner");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  redirect("/");
}
