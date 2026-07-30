"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/utils/tenant-auth";

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
  try {
    await requireAdminSession(madrassaId);

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

    if (error) {
      console.error("updateFestSettings error:", error);
      return { success: false, error: "Failed to update settings. Please try again." };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Fest settings updated successfully." };
  } catch (error) {
    console.error("updateFestSettings error:", error);
    return { success: false, error: "Failed to update settings. Please try again." };
  }
}

export async function changeMadrassaPassword(
  madrassaId: string,
  oldPassword: string,
  newPassword: string
): Promise<SettingsResult> {
  try {
    await requireAdminSession(madrassaId);

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
      console.error("changeMadrassaPassword fetch error:", fetchError);
      return { success: false, error: "Failed to update settings. Please try again." };
    }

    const valid = await bcrypt.compare(oldPassword, (madrassa as any).password_hash);
    if (!valid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabase
      .from("madrassas")
      .update({ password_hash })
      .eq("id", madrassaId);

    if (updateError) {
      console.error("changeMadrassaPassword update error:", updateError);
      return { success: false, error: "Failed to update settings. Please try again." };
    }

    return { success: true, message: "Password changed successfully." };
  } catch (error) {
    console.error("changeMadrassaPassword error:", error);
    return { success: false, error: "Failed to update settings. Please try again." };
  }
}

export async function getMadrassaSettings(madrassaId: string): Promise<{
  data: { name: string; logo_url: string | null; register_number: string; subdomain: string } | null;
  error: string | null;
}> {
  try {
    await requireAdminSession(madrassaId);

    if (!madrassaId) return { data: null, error: "Invalid session." };

    const { data, error } = await supabase
      .from("madrassas")
      .select("name, logo_url, register_number, subdomain")
      .eq("id", madrassaId)
      .single();

    if (error) {
      console.error("getMadrassaSettings error:", error);
      return { data: null, error: "Failed to load settings. Please try again." };
    }
    return { data: data as any, error: null };
  } catch (error) {
    console.error("getMadrassaSettings error:", error);
    return { data: null, error: "Failed to load settings. Please try again." };
  }
}
