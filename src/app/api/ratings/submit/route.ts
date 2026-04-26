import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { recipe_id, rating, comment } = await req.json();

    if (!recipe_id || !rating) {
      return NextResponse.json({ error: 'recipe_id and rating required' }, { status: 400 });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('dish_ratings')
      .upsert(
        {
          user_id: user.id,
          recipe_id,
          rating,
          comment: comment || null,
          rated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recipe_id' }
      )
      .select();

    if (error) {
      console.error('Rating submit error:', error);
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Rating submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
