import { createClient } from "@/lib/supabase/server";
import { generateTastePortrait, type UserProfile } from "@/lib/gigachat/client";
import { NextResponse } from "next/server";

const MEAL_HISTORY_DAYS = 30;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user health profile
    const { data: userGoals, error: goalsError } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (goalsError) {
      console.error("Fetch user goals error:", goalsError);
      return NextResponse.json(
        { error: "Unable to load user profile" },
        { status: 400 }
      );
    }

    // Build UserProfile for Gigachat
    const userProfile: UserProfile = {
      age: userGoals.age,
      sex: userGoals.sex,
      height_cm: userGoals.height_cm,
      weight_kg: userGoals.weight_kg,
      activity_level: userGoals.activity_level,
      primary_goal: userGoals.primary_goal,
      secondary_goals: userGoals.secondary_goals || [],
      dietary_restrictions: userGoals.dietary_restrictions || [],
      allergens: userGoals.allergens || [],
      medical_conditions: userGoals.medical_conditions || [],
      tdee_kcal: userGoals.tdee_kcal,
      target_protein_g: userGoals.target_protein_g,
      target_carbs_g: userGoals.target_carbs_g,
      target_fat_g: userGoals.target_fat_g,
    };

    // Fetch meal history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MEAL_HISTORY_DAYS);

    const { data: mealHistory, error: mealError } = await supabase
      .from("nutrition_logs")
      .select("food_title, calories, protein_g, carbs_g, fat_g, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", thirtyDaysAgo.toISOString())
      .order("logged_at", { ascending: false });

    if (mealError) {
      console.error("Fetch meal history error:", mealError);
      return NextResponse.json(
        { error: "Unable to fetch meal history" },
        { status: 500 }
      );
    }

    // Format meal history for prompt
    const mealHistoryText =
      mealHistory.length > 0
        ? mealHistory
            .map(
              (m) =>
                `- ${m.food_title} (${m.calories} ккал, ${m.protein_g}г белка, ${m.carbs_g}г углеводов, ${m.fat_g}г жиров)`
            )
            .join("\n")
        : "Нет записей о приёмах пищи за последние 30 дней";

    // Fetch rated dishes
    const { data: ratings, error: ratingsError } = await supabase
      .from("dish_ratings")
      .select("rating, recipes(title)")
      .eq("user_id", userId)
      .order("rating", { ascending: false });

    if (ratingsError) {
      console.error("Fetch ratings error:", ratingsError);
      return NextResponse.json(
        { error: "Unable to fetch dish ratings" },
        { status: 500 }
      );
    }

    // Format rated dishes for prompt
    const ratedDishesText =
      ratings.length > 0
        ? ratings
            .map((r) => {
              const recipe = (r.recipes as { title: string }[] | null)?.[0];
              const recipeName = recipe?.title || "Неизвестное блюдо";
              return `- ${recipeName}: ${"⭐".repeat(r.rating)} (${r.rating}/5)`;
            })
            .join("\n")
        : "Нет оценённых блюд";

    // Generate taste portrait via Gigachat
    const portrait = await generateTastePortrait(
      userProfile,
      MEAL_HISTORY_DAYS,
      mealHistoryText,
      ratedDishesText
    );

    // Save or update taste portrait in database
    const { data: existingPortrait } = await supabase
      .from("user_taste_portrait")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingPortrait) {
      // Update existing
      const { error: updateError } = await supabase
        .from("user_taste_portrait")
        .update({
          portrait_data: portrait,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Update taste portrait error:", updateError);
        return NextResponse.json(
          { error: "Failed to save taste portrait" },
          { status: 500 }
        );
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from("user_taste_portrait")
        .insert({
          user_id: userId,
          portrait_data: portrait,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Insert taste portrait error:", insertError);
        return NextResponse.json(
          { error: "Failed to save taste portrait" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      portrait,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generate taste portrait error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
