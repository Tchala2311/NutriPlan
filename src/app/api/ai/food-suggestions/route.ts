import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFoodSuggestion, UserProfile } from '@/lib/gigachat/client';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    dayTotals: {
      current_kcal: number;
      target_kcal: number;
      current_protein_g: number;
      target_protein_g: number;
      current_carbs_g: number;
      target_carbs_g: number;
      current_fat_g: number;
      target_fat_g: number;
    };
    userProfile: Partial<UserProfile>;
  };

  if (!body.dayTotals || !body.userProfile) {
    return NextResponse.json({ error: 'Missing dayTotals or userProfile' }, { status: 400 });
  }

  const suggestion = await getFoodSuggestion(body.userProfile as UserProfile, body.dayTotals);
  return NextResponse.json({ suggestion });
}
