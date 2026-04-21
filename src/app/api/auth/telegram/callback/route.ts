import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyTelegramHash(
  data: Record<string, string>,
  botToken: string
): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const dataCheckString = Object.keys(rest)
    .sort()
    .filter((k) => rest[k] !== undefined && rest[k] !== "")
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const id = searchParams.get("id");
  const hash = searchParams.get("hash");
  const authDate = searchParams.get("auth_date");

  if (!id || !hash || !authDate) {
    return NextResponse.redirect(`${origin}/login?error=telegram_missing_data`);
  }

  // Check auth_date is within 1 day
  const age = Math.floor(Date.now() / 1000) - parseInt(authDate, 10);
  if (age > 86400) {
    return NextResponse.redirect(`${origin}/login?error=telegram_auth_expired`);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.redirect(`${origin}/login?error=telegram_not_configured`);
  }

  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  if (!verifyTelegramHash(rawParams, botToken)) {
    return NextResponse.redirect(`${origin}/login?error=telegram_invalid_hash`);
  }

  // Telegram doesn't provide email — use synthetic unique address
  const email = `tg${id}@tg.placeholder`;

  const admin = createAdminClient();

  const firstName = searchParams.get("first_name") ?? "";
  const lastName = searchParams.get("last_name") ?? "";
  const username = searchParams.get("username") ?? undefined;
  const photoUrl = searchParams.get("photo_url") ?? undefined;

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      provider: "telegram",
      provider_id: id,
      full_name: [firstName, lastName].filter(Boolean).join(" ") || undefined,
      username,
      avatar_url: photoUrl,
    },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    return NextResponse.redirect(`${origin}/login?error=oauth_create_failed`);
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback` },
    });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.redirect(`${origin}/login?error=oauth_link_failed`);
  }

  return NextResponse.redirect(linkData.properties.action_link);
}
