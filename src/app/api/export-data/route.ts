import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query params: limit (default 1000), offset (default 0), startDate, endDate
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 10000); // cap at 10k
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate'); // YYYY-MM-DD

  let nutritionQuery = supabase
    .from('nutrition_logs')
    .select('logged_date, meal_type, food_name, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    nutritionQuery = nutritionQuery.gte('logged_date', startDate);
  }
  if (endDate) {
    nutritionQuery = nutritionQuery.lte('logged_date', endDate);
  }

  let waterQuery = supabase
    .from('water_logs')
    .select('logged_at, amount_ml')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    waterQuery = waterQuery.gte('logged_at', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    waterQuery = waterQuery.lte('logged_at', `${endDate}T23:59:59Z`);
  }

  const [{ data: nutrition }, { data: water }] = await Promise.all([nutritionQuery, waterQuery]);

  // Empty-state guard: return helpful message when no data exists for the range
  if ((nutrition ?? []).length === 0 && (water ?? []).length === 0) {
    const rangeMsg =
      startDate || endDate
        ? `за период ${startDate ?? '…'} — ${endDate ?? '…'}`
        : 'за последние записи';
    return NextResponse.json(
      {
        error: `Нет данных для экспорта ${rangeMsg}. Начните вести дневник питания, чтобы выгрузить данные.`,
      },
      { status: 404 }
    );
  }

  const lines: string[] = [];

  lines.push('# NutriPlan — Data Export');
  lines.push(`# User: ${user.email}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Nutrition Logs');
  lines.push('date,meal_type,food_name,calories,protein_g,carbs_g,fat_g');
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
      ].join(',')
    );
  }

  lines.push('');
  lines.push('## Water Logs');
  lines.push('logged_at,amount_ml');
  for (const row of water ?? []) {
    lines.push([row.logged_at, row.amount_ml].join(','));
  }

  const csv = lines.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nutriplan-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
