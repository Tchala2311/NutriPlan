import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFoodPhotoAnalysis, type WeekRecipeContext } from '@/lib/gigachat/client';

export const runtime = 'nodejs';
// Max 4 MB upload
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) return NextResponse.json({ error: 'No photo provided' }, { status: 400 });

  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Photo too large (max 4 MB)' }, { status: 413 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported image format' }, { status: 415 });
  }

  // Optional: week recipes JSON for recipe matching
  let weekRecipes: WeekRecipeContext[] | undefined;
  const recipesRaw = formData.get('weekRecipes');
  if (typeof recipesRaw === 'string' && recipesRaw) {
    try {
      weekRecipes = JSON.parse(recipesRaw) as WeekRecipeContext[];
    } catch {
      // ignore malformed recipes context
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await getFoodPhotoAnalysis(buffer, file.type, weekRecipes);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[food-photo] GigaChat error:', message);
    return NextResponse.json(
      { error: 'Failed to analyse photo', detail: message },
      { status: 502 }
    );
  }
}
