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
};

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("user_settings")
    .select("units, language, notification_prefs, training_days")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return DEFAULT_SETTINGS;

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
  const trainingDaysRaw = formData.getAll("training_days").map(Number);

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
    training_days: trainingDaysRaw.length > 0 ? trainingDaysRaw : [0, 2, 4, 5],
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert(settings, { onConflict: "user_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
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
