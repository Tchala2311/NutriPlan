import type { Metadata } from "next";
import { isPremium } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { createClient } from "@/lib/supabase/server";
import { RecipeLibraryClient } from "@/components/planner/RecipeLibraryClient";
import type { RecipeSummary } from "@/app/dashboard/planner/actions";

export const metadata: Metadata = { title: "Рецепты — NutriPlan" };

export default async function RecipesPage() {
  const premium = await isPremium();

  if (!premium) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bark-300">Рецепты</h1>
          <p className="mt-1 text-sm text-muted-foreground">Рецепты, подобранные под ваши цели.</p>
        </div>
        <UpgradePrompt
          feature="База рецептов"
          description="Получите доступ к персональным рецептам с полным расчётом КБЖУ, подобранным под ваши цели."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = user
    ? await supabase
        .from("saved_recipes")
        .select("saved_at, recipe:recipe_id(id, title, prep_time_min, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, ingredients, instructions, dietary_tags, substitutions)")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false })
    : { data: [] };

  const savedRecipes = (rows ?? [])
    .filter((r) => r.recipe)
    .map((r) => ({
      recipe: r.recipe as unknown as RecipeSummary,
      saved_at: r.saved_at,
    }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Мои рецепты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Рецепты, сохранённые из планировщика питания.
        </p>
      </div>
      <RecipeLibraryClient savedRecipes={savedRecipes} />
    </div>
  );
}
