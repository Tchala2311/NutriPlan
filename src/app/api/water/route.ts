import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/water?date=YYYY-MM-DD — total ml logged today */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('water_logs')
    .select('id, amount_ml, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', dayStart)
    .lte('logged_at', dayEnd)
    .order('logged_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalMl = (data ?? []).reduce((s, r) => s + r.amount_ml, 0);
  return NextResponse.json({ totalMl, entries: data ?? [] });
}

/** POST /api/water — log water intake */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { amount_ml: number };
  const amount = Math.round(Number(body.amount_ml));
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'amount_ml must be a positive integer' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, amount_ml: amount })
    .select('id, amount_ml, logged_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

/** DELETE /api/water?id=... — remove a specific water log entry */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('water_logs').delete().eq('id', id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
