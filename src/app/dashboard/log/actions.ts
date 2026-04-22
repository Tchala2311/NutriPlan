"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFoodEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const photoUrl = formData.get("photo_url");
  const entry: Record<string, unknown> = {
    user_id: user.id,
    logged_date: formData.get("logged_date") as string,
    meal_type: formData.get("meal_type") as string,
    food_name: formData.get("food_name") as string,
    calories: Number(formData.get("calories") ?? 0),
    protein_g: Number(formData.get("protein_g") ?? 0),
    carbs_g: Number(formData.get("carbs_g") ?? 0),
    fat_g: Number(formData.get("fat_g") ?? 0),
  };
  if (photoUrl) entry.photo_url = photoUrl as string;

  const { error } = await supabase.from("nutrition_logs").insert(entry);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/log");
}

export interface FoodEntryData {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  logged_date: string;
  photo_url?: string;
}

export async function addFoodEntries(entries: FoodEntryData[]) {
  if (!entries.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const rows = entries.map((e) => ({
    user_id: user.id,
    logged_date: e.logged_date,
    meal_type: e.meal_type,
    food_name: e.food_name,
    calories: e.calories,
    protein_g: e.protein_g,
    carbs_g: e.carbs_g,
    fat_g: e.fat_g,
    ...(e.photo_url ? { photo_url: e.photo_url } : {}),
  }));

  const { error } = await supabase.from("nutrition_logs").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/log");
}

export async function deleteFoodEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/log");
}
