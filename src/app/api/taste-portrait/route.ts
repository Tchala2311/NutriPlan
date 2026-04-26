import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_taste_portrait')
      .select('portrait_data, generated_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No portrait generated yet
        return NextResponse.json({ portrait: null, status: 'not_generated' });
      }
      console.error('Get taste portrait error:', error);
      return NextResponse.json({ error: 'Failed to fetch taste portrait' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      status: 'generated',
    });
  } catch (error) {
    console.error('Get taste portrait error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
