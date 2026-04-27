import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shared_plan_token = searchParams.get('token');
    const meal_plan_id = searchParams.get('meal_plan_id');

    if (!shared_plan_token || !meal_plan_id) {
      return Response.json({ error: 'Missing token or meal_plan_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify shared plan is valid
    const { data: shared, error: shareError } = await supabase
      .from('shared_plans')
      .select('meal_plan_id, expires_at')
      .eq('token', shared_plan_token)
      .eq('meal_plan_id', meal_plan_id)
      .maybeSingle();

    if (shareError || !shared) {
      return Response.json({ error: 'Invalid shared plan' }, { status: 404 });
    }

    const s = shared as { expires_at: string };
    if (new Date(s.expires_at) < new Date()) {
      return Response.json({ error: 'Shared plan expired' }, { status: 410 });
    }

    // Fetch all reactions for this meal plan
    const { data: reactions, error } = await supabase
      .from('meal_reactions')
      .select('meal_date, meal_type, emoji, user_id, created_at')
      .eq('meal_plan_id', meal_plan_id);

    if (error) {
      console.error('Reactions fetch error:', error);
      return Response.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    return Response.json({ success: true, data: reactions ?? [] });
  } catch (e) {
    console.error('API error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
