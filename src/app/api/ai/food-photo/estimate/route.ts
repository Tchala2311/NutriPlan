import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { estimateIngredientNutrition } from '@/lib/gigachat/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { ingredient: string; weight_g?: number };
  if (!body.ingredient?.trim()) {
    return NextResponse.json({ error: 'ingredient is required' }, { status: 400 });
  }

  try {
    const result = await estimateIngredientNutrition(body.ingredient.trim(), body.weight_g);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[food-photo/estimate] GigaChat error:', message);
    return NextResponse.json(
      { error: 'Failed to estimate ingredient', detail: message },
      { status: 502 }
    );
  }
}
