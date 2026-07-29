import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/admin/settings?drive_error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/admin/settings?drive_error=missing_code_or_state`
    );
  }

  let madrassaId: string;
  try {
    const parsedState = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
    madrassaId = parsedState.madrassaId;
    if (!madrassaId) throw new Error("madrassaId missing in state");
  } catch {
    return NextResponse.redirect(
      `${origin}/admin/settings?drive_error=invalid_state`
    );
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/admin/settings?drive_error=no_refresh_token&hint=revoke_and_retry`
      );
    }

    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("madrassas")
      .update({
        drive_refresh_token: tokens.refresh_token,
        drive_access_token: tokens.access_token ?? null,
        drive_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        drive_connected_at: new Date().toISOString(),
      })
      .eq("id", madrassaId);

    if (updateError) {
      console.error("Failed to save Drive refresh token:", updateError);
      return NextResponse.redirect(
        `${origin}/admin/settings?drive_error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${origin}/admin/settings?drive_connected=true`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${origin}/admin/settings?drive_error=token_exchange_failed`
    );
  }
}
