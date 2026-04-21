import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/phases/[phaseId]/days — list all days for a phase */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;

  const { data, error } = await supabase
    .from("days")
    .select("id, phase_id, week_number, day_number, day_type, calorie_target, protein_target_g, carbs_target_g, fat_target_g")
    .eq("phase_id", phaseId)
    .order("week_number", { ascending: true })
    .order("day_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
