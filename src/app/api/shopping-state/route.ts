import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/shopping-state
 * Upserts the user's shopping state for a week+window.
 * Body: { week: number, window: "A"|"B", shop_assignments?, links?, shop_checks?, people? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    week?: number;
    window?: string;
    shop_assignments?: Record<string, string>;
    links?: Record<string, string>;
    shop_checks?: Record<string, boolean>;
    people?: number;
  };

  const week   = Number(body.week);
  const window = body.window?.toUpperCase();

  if (!week || week < 1 || week > 8) {
    return NextResponse.json({ error: "week must be 1–8" }, { status: 400 });
  }
  if (window !== "A" && window !== "B") {
    return NextResponse.json({ error: "window must be A or B" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    user_id:         user.id,
    week,
    shopping_window: window,
    updated_at:      new Date().toISOString(),
  };
  if (body.shop_assignments !== undefined) payload.shop_assignments = body.shop_assignments;
  if (body.links            !== undefined) payload.links            = body.links;
  if (body.shop_checks      !== undefined) payload.shop_checks      = body.shop_checks;
  if (body.people           !== undefined) payload.people           = Number(body.people);

  const { data, error } = await supabase
    .from("user_shopping_state")
    .upsert(payload, { onConflict: "user_id,week,shopping_window" })
    .select("id, week, shopping_window, shop_assignments, links, shop_checks, people, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * GET /api/shopping-state?week=N&window=A
 * Fetch the user's shopping state for a specific week+window.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week   = Number(req.nextUrl.searchParams.get("week"));
  const window = req.nextUrl.searchParams.get("window")?.toUpperCase();

  if (!week || week < 1 || week > 8) {
    return NextResponse.json({ error: "week must be 1–8" }, { status: 400 });
  }
  if (window !== "A" && window !== "B") {
    return NextResponse.json({ error: "window must be A or B" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_shopping_state")
    .select("id, week, shopping_window, shop_assignments, links, shop_checks, people, updated_at")
    .eq("user_id", user.id)
    .eq("week", week)
    .eq("shopping_window", window)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    data ?? { week, shopping_window: window, shop_assignments: {}, links: {}, shop_checks: {}, people: 1 }
  );
}
