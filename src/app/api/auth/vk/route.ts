import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.VK_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/vk/callback`,
    scope: "email",
    response_type: "code",
    state,
    v: "5.199",
  });

  const response = NextResponse.redirect(
    `https://oauth.vk.com/authorize?${params}`
  );
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
