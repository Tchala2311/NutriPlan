import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: nutrition }, { data: water }] = await Promise.all([
    supabase
      .from("nutrition_logs")
      .select("logged_date, meal_type, food_name, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .order("logged_date", { ascending: false }),
    supabase
      .from("water_logs")
      .select("logged_at, amount_ml")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false }),
  ]);

  const lines: string[] = [];

  lines.push("# NutriPlan — Data Export");
  lines.push(`# User: ${user.email}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Nutrition Logs");
  lines.push("date,meal_type,food_name,calories,protein_g,carbs_g,fat_g");
  for (const row of nutrition ?? []) {
    lines.push(
      [
        row.logged_date,
        row.meal_type,
        `"${String(row.food_name).replace(/"/g, '""')}"`,
        row.calories,
        row.protein_g,
        row.carbs_g,
        row.fat_g,
      ].join(",")
    );
  }

  lines.push("");
  lines.push("## Water Logs");
  lines.push("logged_at,amount_ml");
  for (const row of water ?? []) {
    lines.push([row.logged_at, row.amount_ml].join(","));
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutriplan-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
