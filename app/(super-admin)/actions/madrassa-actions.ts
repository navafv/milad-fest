"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type MadrassaRow = {
  id: string;
  name: string;
  register_number: string;
  subdomain: string;
  is_active: boolean;
  created_at: string;
};

export type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function createMadrassa(formData: FormData): Promise<ActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const register_number = (formData.get("register_number") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const subdomain = (formData.get("subdomain") as string)?.trim().toLowerCase();

  if (!name || !register_number || !password || !subdomain) {
    return { success: false, error: "All fields are required." };
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      success: false,
      error: "Subdomain may only contain lowercase letters, numbers, and hyphens.",
    };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  // Check for existing register_number or subdomain
  const { data: existing, error: lookupError } = await supabase
    .from("madrassas")
    .select("id")
    .or(`register_number.eq.${register_number},subdomain.eq.${subdomain}`)
    .limit(1);

  if (lookupError) {
    return { success: false, error: "Database error during validation." };
  }

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: "A Madrassa with that Register Number or Subdomain already exists.",
    };
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error: insertError } = await supabase.from("madrassas").insert({
    name,
    register_number,
    password_hash,
    subdomain,
    is_active: true,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/dashboard");
  return { success: true, message: `Madrassa "${name}" created successfully.` };
}

export async function toggleMadrassaStatus(
  id: string,
  currentStatus: boolean
): Promise<ActionResult> {
  if (!id) {
    return { success: false, error: "Invalid Madrassa ID." };
  }

  const { error } = await supabase
    .from("madrassas")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: `Madrassa ${!currentStatus ? "activated" : "deactivated"} successfully.`,
  };
}

export async function getAllMadrassas(): Promise<{
  data: MadrassaRow[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("madrassas")
    .select("id, name, register_number, subdomain, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MadrassaRow[], error: null };
}
