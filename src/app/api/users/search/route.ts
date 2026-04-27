/**
 * GET /api/users/search?q=username
 *
 * Search for users by username (for @mention autocomplete + friend search)
 * Returns: { results: [{ id, username, display_name }, ...] }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Search users by username or display_name (case-insensitive prefix match)
    const { data: results, error } = await supabase
      .from('user_settings')
      .select('user_id, username, display_name')
      .or(`username.ilike.${query}%,display_name.ilike.${query}%`)
      .not('username', 'is', null)
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      results:
        results?.map((r) => ({
          id: r.user_id,
          username: r.username,
          displayName: r.display_name,
        })) ?? [],
    });
  } catch (err) {
    console.error('[users/search GET] Error:', err);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
