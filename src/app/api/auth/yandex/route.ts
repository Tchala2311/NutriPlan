import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.YANDEX_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/yandex/callback`,
    state,
    scope: 'login:email login:info',
  });

  const response = NextResponse.redirect(`https://oauth.yandex.ru/authorize?${params}`);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
