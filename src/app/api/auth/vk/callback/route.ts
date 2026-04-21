import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const savedState = request.headers.get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("oauth_state="))
    ?.split("=")[1]
    ?.trim();

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (errorParam || !code) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    );
  }

  if (!savedState || savedState !== state) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_state_mismatch`)
    );
  }

  // Exchange code for token (VK uses GET or POST to this endpoint)
  const tokenUrl = new URL("https://oauth.vk.com/access_token");
  tokenUrl.searchParams.set("client_id", process.env.VK_CLIENT_ID!);
  tokenUrl.searchParams.set("client_secret", process.env.VK_CLIENT_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", `${origin}/api/auth/vk/callback`);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());

  if (!tokenRes.ok) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_token_failed`)
    );
  }

  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_token_failed`)
    );
  }

  // VK returns email directly in the token response when scope includes email
  const email: string | undefined = tokenData.email;
  const vkUserId: number = tokenData.user_id;

  if (!email) {
    // VK account has no email — cannot sign in
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=vk_no_email`)
    );
  }

  const admin = createAdminClient();

  // Ensure user exists in Supabase (ignore "already registered" errors)
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      provider: "vk",
      provider_id: String(vkUserId),
    },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_create_failed`)
    );
  }

  // Generate a magic link to establish the Supabase session
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback` },
    });

  if (linkError || !linkData?.properties?.action_link) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/login?error=oauth_link_failed`)
    );
  }

  return clearStateCookie(
    NextResponse.redirect(linkData.properties.action_link)
  );
}
