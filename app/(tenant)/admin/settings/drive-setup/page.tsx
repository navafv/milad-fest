import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function buildGoogleAuthUrl(madrassaId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";

  const state = Buffer.from(JSON.stringify({ madrassaId })).toString(
    "base64url"
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/drive.file",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default async function DriveSetupPage({
  searchParams,
}: {
  searchParams?: {
    madrassaId?: string;
    drive_connected?: string;
    drive_error?: string;
  };
}) {
  const madrassaId = searchParams?.madrassaId ?? "";
  const isConnected = searchParams?.drive_connected === "true";
  const driveError = searchParams?.drive_error;

  let connectedStatus = false;
  let madrassaName = "";

  if (madrassaId) {
    const supabase = await createClient();
    const { data: madrassa } = await supabase
      .from("madrassas")
      .select("name, drive_refresh_token")
      .eq("id", madrassaId)
      .single();

    connectedStatus = Boolean(madrassa?.drive_refresh_token);
    madrassaName = madrassa?.name ?? "";
  }

  const authUrl = madrassaId ? buildGoogleAuthUrl(madrassaId) : "#";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        Google Drive Connection
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Connect {madrassaName || "your madrassa"}&apos;s Google Drive account
        so generated certificates can be automatically backed up and shared.
      </p>

      {isConnected && (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Google Drive was connected successfully.
        </div>
      )}

      {driveError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Connection failed: {driveError.replace(/_/g, " ")}. Please try
          again.
        </div>
      )}

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Connection Status
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {connectedStatus
                ? "Your Google Drive account is connected."
                : "No Google Drive account connected yet."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connectedStatus
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {connectedStatus ? "Connected" : "Not Connected"}
          </span>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-900">
            How it works
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-600">
            <li>
              Click &quot;Connect Google Drive&quot; below — you&apos;ll be
              redirected to Google&apos;s consent screen.
            </li>
            <li>
              Sign in with the Google account you want to use for storing
              certificates, and grant access.
            </li>
            <li>
              You&apos;ll be redirected back here automatically once the
              connection is complete.
            </li>
            <li>
              After connecting, generated certificates can be uploaded
              directly to this Drive account as PNG files.
            </li>
          </ol>
        </div>

        <div className="mt-6">
          {madrassaId ? (
            <Link
              href={authUrl}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {connectedStatus
                ? "Reconnect Google Drive"
                : "Connect Google Drive"}
            </Link>
          ) : (
            <p className="text-sm text-red-600">
              Missing madrassaId — cannot generate the Google authorization
              link.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
