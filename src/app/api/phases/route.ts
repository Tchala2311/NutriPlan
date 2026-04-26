import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/phases — list all phases with week count */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('phases')
    .select('id, name, order_index, duration_weeks, goal_type')
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
