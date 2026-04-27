import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { shared_plan_token, meal_plan_id, meal_date, meal_type, emoji, user_id } = await req.json();

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

    // Delete reaction
    const { error } = await supabase
      .from('meal_reactions')
      .delete()
      .eq('meal_plan_id', meal_plan_id)
      .eq('meal_date', meal_date)
      .eq('meal_type', meal_type)
      .eq('user_id', user_id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Reaction delete error:', error);
      return Response.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('API error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
