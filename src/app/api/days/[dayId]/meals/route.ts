import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/days/[dayId]/meals — list meals for a specific program day */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dayId } = await params;

  const { data, error } = await supabase
    .from('meals')
    .select(
      'id, day_id, meal_type, name, description, kcal, protein_g, carbs_g, fat_g, is_batch, is_flexible, prep_time_min'
    )
    .eq('day_id', dayId)
    .order('meal_type', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
