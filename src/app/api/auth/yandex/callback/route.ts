import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const savedState = request.headers
    .get('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('oauth_state='))
    ?.split('=')[1]
    ?.trim();

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });
    return res;
  };

  if (errorParam || !code) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_failed`));
  }

  if (!savedState || savedState !== state) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_state_mismatch`));
  }

  // Exchange code for token
  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.YANDEX_CLIENT_ID!,
      client_secret: process.env.YANDEX_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/yandex/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_token_failed`));
  }

  const { access_token } = await tokenRes.json();

  // Get user info
  const userRes = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${access_token}` },
  });

  if (!userRes.ok) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_user_failed`));
  }

  const yandexUser = await userRes.json();
  const email: string | undefined = yandexUser.default_email;

  if (!email) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_no_email`));
  }

  const admin = createAdminClient();

  // Ensure user exists in Supabase (ignore "already registered" errors)
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      provider: 'yandex',
      provider_id: String(yandexUser.id),
      full_name: yandexUser.real_name || yandexUser.display_name || '',
      avatar_url: yandexUser.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
        : undefined,
    },
  });

  if (createError && !createError.message.toLowerCase().includes('already')) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_create_failed`));
  }

  // Generate a magic link to establish the Supabase session
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login?error=oauth_link_failed`));
  }

  return clearStateCookie(NextResponse.redirect(linkData.properties.action_link));
}
