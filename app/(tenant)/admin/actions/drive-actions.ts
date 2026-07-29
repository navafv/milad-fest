"use server";

import { google } from "googleapis";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { verifyTenantAccess, TenantAuthError } from "@/lib/utils/tenant-auth";

export interface UploadCertificateResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

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

function sanitizeForFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function uploadCertificateToDrive(
  madrassaId: string,
  studentName: string,
  eventName: string,
  rank: number
): Promise<UploadCertificateResult> {
  try {
    await verifyTenantAccess(madrassaId);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unauthorized." };
  }

  const supabase = await createClient();

  const { data: madrassa, error: madrassaError } = await supabase
    .from("madrassas")
    .select("id, name, drive_refresh_token, drive_folder_id")
    .eq("id", madrassaId)
    .single();

  if (madrassaError || !madrassa) {
    return { success: false, error: "Madrassa not found." };
  }

  if (!madrassa.drive_refresh_token) {
    return {
      success: false,
      error: "Google Drive is not connected for this madrassa.",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return {
      success: false,
      error: "Missing NEXT_PUBLIC_APP_URL environment variable.",
    };
  }

  let imageBuffer: Buffer;
  try {
    const certUrl = new URL("/api/certificate", appUrl);
    certUrl.searchParams.set("madrassaName", madrassa.name ?? "Milad Fest");
    certUrl.searchParams.set("studentName", studentName);
    certUrl.searchParams.set("eventName", eventName);
    certUrl.searchParams.set("rank", String(rank));

    const certResponse = await fetch(certUrl.toString());

    if (!certResponse.ok) {
      return {
        success: false,
        error: `Failed to generate certificate image (status ${certResponse.status}).`,
      };
    }

    const arrayBuffer = await certResponse.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Certificate fetch error:", err);
    return { success: false, error: "Failed to fetch certificate image." };
  }

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: madrassa.drive_refresh_token,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const rankLabel = ordinal(rank);
    const fileName = `${sanitizeForFilename(rankLabel)}-${sanitizeForFilename(
      eventName
    )}-${sanitizeForFilename(studentName)}.png`;

    const fileMetadata: Record<string, unknown> = {
      name: fileName,
    };
    if (madrassa.drive_folder_id) {
      fileMetadata.parents = [madrassa.drive_folder_id];
    }

    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: "image/png",
        body: bufferToStream(imageBuffer),
      },
      fields: "id, webViewLink",
    });

    return {
      success: true,
      fileId: uploadResponse.data.id ?? undefined,
      webViewLink: uploadResponse.data.webViewLink ?? undefined,
    };
  } catch (err) {
    console.error("Google Drive upload error:", err);
    return {
      success: false,
      error: "Failed to upload certificate to Google Drive.",
    };
  }
}
