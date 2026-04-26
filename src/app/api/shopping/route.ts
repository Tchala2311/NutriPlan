import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/shopping
 * Query params: phase (1|2), week (1-8), window (A|B)
 * Returns shopping items ordered by category_order then item_name.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const phase = searchParams.get('phase');
  const week = searchParams.get('week');
  const window = searchParams.get('window');

  let query = supabase
    .from('shopping_items')
    .select(
      'id, phase, week, shopping_window, category, category_order, item_name, quantity_per_person, store, url'
    )
    .order('category_order', { ascending: true })
    .order('item_name', { ascending: true });

  if (phase) query = query.eq('phase', Number(phase));
  if (week) query = query.eq('week', Number(week));
  if (window) query = query.eq('shopping_window', window.toUpperCase());

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
