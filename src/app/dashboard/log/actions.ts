"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFoodEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const entry = {
    user_id: user.id,
    logged_date: formData.get("logged_date") as string,
    meal_type: formData.get("meal_type") as string,
    food_name: formData.get("food_name") as string,
    calories: Number(formData.get("calories") ?? 0),
    protein_g: Number(formData.get("protein_g") ?? 0),
    carbs_g: Number(formData.get("carbs_g") ?? 0),
    fat_g: Number(formData.get("fat_g") ?? 0),
  };

  const { error } = await supabase.from("nutrition_logs").insert(entry);
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
