/**
 * GET /api/users/@[username]
 *
 * Get user profile by username.
 * Returns: { id, username, display_name, user_goals, health_assessments (summary) }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await params;
    const username = rawUsername.replace(/^@/, '').toLowerCase();

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user by username
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select(
        'user_id, username, display_name'
      )
      .eq('username', username)
      .single();

    if (settingsError || !userSettings) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user goals (dietary preferences, primary goal)
    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('primary_goal, daily_calorie_target, protein_target_g')
      .eq('user_id', userSettings.user_id)
      .single();

    // Get health assessment summary (dietary restrictions, allergens)
    const { data: healthAssessment } = await supabase
      .from('health_assessments')
      .select('dietary_restrictions, allergens, health_goals')
      .eq('user_id', userSettings.user_id)
      .single();

    return NextResponse.json({
      id: userSettings.user_id,
      username: userSettings.username,
      displayName: userSettings.display_name,
      goal: userGoals?.primary_goal,
      calorieTarget: userGoals?.daily_calorie_target,
      dietaryRestrictions: healthAssessment?.dietary_restrictions ?? [],
      allergens: healthAssessment?.allergens ?? [],
      healthGoals: healthAssessment?.health_goals ?? [],
    });
  } catch (err) {
    console.error('[users/[username] GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
