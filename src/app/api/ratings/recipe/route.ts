import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipe_id = searchParams.get("recipe_id");

    if (!recipe_id) {
      return NextResponse.json(
        { error: "recipe_id required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("dish_ratings")
      .select("id, rating, comment, rated_at")
      .eq("recipe_id", recipe_id)
      .order("rated_at", { ascending: false });

    if (error) {
      console.error("Get ratings error:", error);
      return NextResponse.json(
        { error: "Failed to fetch ratings" },
        { status: 500 }
      );
    }

    // Calculate average rating
    const avg_rating =
      data.length > 0
        ? (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1)
        : null;

    return NextResponse.json({
      ratings: data,
      count: data.length,
      average_rating: avg_rating,
    });
  } catch (error) {
    console.error("Get ratings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
