/**
 * POST /api/referrals
 *
 * Create referral record when a new user signs up with a ?ref= code.
 * Expects: { referred_user_id, referral_code }
 * referral_code = referrer's user ID
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { referred_user_id, referral_code } = await req.json();

    if (!referred_user_id || !referral_code) {
      return NextResponse.json(
        { error: 'Missing referred_user_id or referral_code' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify referrer exists
    const { data: referrer, error: referrerError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('id', referral_code)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Create referral record
    const { error: referralError } = await supabase.from('referrals').insert({
      referrer_id: referral_code,
      referred_user_id,
      status: 'pending',
    });

    if (referralError) {
      // If referral already exists (user already referred), silently continue
      if (referralError.code !== '23505') {
        throw referralError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[referrals POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create referral record' }, { status: 500 });
  }
}

/**
 * GET /api/referrals
 *
 * Get referral stats + link for current user.
 * Returns: { stats, referral_link }
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', user.id);

    if (error) throw error;

    // Generate referral link (use origin from request)
    const origin = new URL(req.url).origin;
    const referralLink = `${origin}/register?ref=${user.id}`;

    const stats = {
      total_referrals: referrals?.length ?? 0,
      completed_referrals: referrals?.filter((r) => r.status === 'completed').length ?? 0,
      pending_referrals: referrals?.filter((r) => r.status === 'pending').length ?? 0,
      rewarded_referrals: referrals?.filter((r) => r.status === 'rewarded').length ?? 0,
    };

    return NextResponse.json({ stats, referral_link: referralLink });
  } catch (err) {
    console.error('[referrals GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch referral stats' }, { status: 500 });
  }
}
