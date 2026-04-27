import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { shared_plan_token, meal_plan_id, meal_date, meal_type, emoji, user_id } = await req.json();

    // Validate emoji
    const VALID_EMOJIS = ['👍', '🔥', '🤢', '❤️'];
    if (!VALID_EMOJIS.includes(emoji)) {
      return Response.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Validate meal_type
    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
    if (!VALID_MEAL_TYPES.includes(meal_type)) {
      return Response.json({ error: 'Invalid meal type' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify shared plan is valid and not expired
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

    // Insert reaction (unique constraint prevents duplicates)
    const { data, error } = await supabase
      .from('meal_reactions')
      .insert({
        meal_plan_id,
        meal_date,
        meal_type,
        user_id,
        emoji,
      })
      .select();

    if (error) {
      // Unique constraint violation - reaction already exists
      if (error.code === '23505') {
        return Response.json({ success: true, message: 'Reaction already exists' });
      }
      console.error('Reaction insert error:', error);
      return Response.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (e) {
    console.error('API error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
