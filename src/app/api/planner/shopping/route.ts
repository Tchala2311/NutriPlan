import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/shopping?week=1&window=A
 *
 * Returns shopping items for a given week from the static catalog.
 * window: "A" = days 1–3, "B" = days 4–7 (defaults to both if omitted).
 *
 * Response shape:
 *   items: Array<{ category: string; category_order: number; item_name: string; quantity_per_person: string }>
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const week = parseInt(searchParams.get("week") ?? "1", 10);
  const window = searchParams.get("window"); // "A", "B", or null (all)

  if (isNaN(week) || week < 1 || week > 8) {
    return NextResponse.json({ error: "week must be 1–8" }, { status: 400 });
  }

  let query = supabase
    .from("shopping_items")
    .select("category, category_order, item_name, quantity_per_person, shopping_window")
    .eq("week", week)
    .order("category_order")
    .order("item_name");

  if (window === "A" || window === "B") {
    query = query.eq("shopping_window", window);
  }

  const { data: items, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}
