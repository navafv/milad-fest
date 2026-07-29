"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SettingsResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function updateFestSettings(
  madrassaId: string,
  festName: string,
  logoUrl: string
): Promise<SettingsResult> {
  if (!madrassaId) return { success: false, error: "Invalid session." };

  const name = festName.trim();
  const logo_url = logoUrl.trim();

  if (!name) return { success: false, error: "Fest name is required." };

  if (logo_url && !/^https?:\/\/.+/.test(logo_url)) {
    return { success: false, error: "Logo URL must be a valid http/https URL." };
  }

  const { error } = await supabase
    .from("madrassas")
    .update({ name, logo_url: logo_url || null })
    .eq("id", madrassaId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/settings");
  return { success: true, message: "Fest settings updated successfully." };
}

export async function changeMadrassaPassword(
  madrassaId: string,
  oldPassword: string,
  newPassword: string
): Promise<SettingsResult> {
  if (!madrassaId) return { success: false, error: "Invalid session." };
  if (!oldPassword || !newPassword) {
    return { success: false, error: "Both old and new passwords are required." };
  }
  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters." };
  }
  if (oldPassword === newPassword) {
    return { success: false, error: "New password must differ from the current one." };
  }

  const { data: madrassa, error: fetchError } = await supabase
    .from("madrassas")
    .select("password_hash")
    .eq("id", madrassaId)
    .single();

  if (fetchError || !madrassa) {
    return { success: false, error: "Could not retrieve account details." };
  }

  const valid = await bcrypt.compare(oldPassword, madrassa.password_hash);
  if (!valid) {
    return { success: false, error: "Current password is incorrect." };
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  const { error: updateError } = await supabase
    .from("madrassas")
    .update({ password_hash })
    .eq("id", madrassaId);

  if (updateError) return { success: false, error: updateError.message };

  return { success: true, message: "Password changed successfully." };
}

export async function getMadrassaSettings(madrassaId: string): Promise<{
  data: { name: string; logo_url: string | null; register_number: string; subdomain: string } | null;
  error: string | null;
}> {
  if (!madrassaId) return { data: null, error: "Invalid session." };

  const { data, error } = await supabase
    .from("madrassas")
    .select("name, logo_url, register_number, subdomain")
    .eq("id", madrassaId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
