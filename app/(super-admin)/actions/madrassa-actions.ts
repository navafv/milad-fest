// app/(super-admin)/actions/madrassa-actions.ts

"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPER_ADMIN_SESSION_COOKIE = "super_admin_session";

if (!process.env.SUPER_ADMIN_JWT_SECRET) {
  throw new Error("SUPER_ADMIN_JWT_SECRET environment variable is not set.");
}

const SUPER_ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET
);

interface SuperAdminSessionPayload {
  superAdminId: string;
  role: "super_admin";
}

/**
 * DUMMY / BASIC IMPLEMENTATION.
 *
 * This verifies a signed JWT stored in an httpOnly cookie and confirms the
 * payload carries a "super_admin" role claim. It intentionally does NOT
 * hit the database on every call (no session-revocation / DB-backed check).
 *
 * Replace this with your real super-admin auth module (e.g. an equivalent
 * of `verifySession` from the tenant-admin auth actions) as soon as one
 * exists. Wire it up the same way `requireAdminSession` wraps `verifySession`
 * elsewhere in this codebase.
 */
async function verifySuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SUPER_ADMIN_JWT_SECRET);

    if (
      payload &&
      typeof payload.superAdminId === "string" &&
      payload.role === "super_admin"
    ) {
      return {
        superAdminId: payload.superAdminId,
        role: "super_admin",
      };
    }

    return null;
  } catch {
    return null;
  }
}

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
  const session = await verifySuperAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

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

  // Check for an existing register_number or subdomain using two explicit,
  // safe equality queries instead of interpolating user input into a
  // PostgREST `.or()` filter string. Building `.or()` from raw input lets a
  // value containing a comma or parenthesis rewrite the filter's structure
  // (e.g. injecting an unintended extra OR clause) rather than being treated
  // as a literal value.
  const [{ data: byRegNumber, error: regLookupError }, { data: bySubdomain, error: subLookupError }] =
    await Promise.all([
      supabase.from("madrassas").select("id").eq("register_number", register_number).limit(1),
      supabase.from("madrassas").select("id").eq("subdomain", subdomain).limit(1),
    ]);

  if (regLookupError || subLookupError) {
    console.error("createMadrassa lookup error:", regLookupError ?? subLookupError);
    return {
      success: false,
      error: "Something went wrong while managing the Madrassa. Please try again.",
    };
  }

  if ((byRegNumber && byRegNumber.length > 0) || (bySubdomain && bySubdomain.length > 0)) {
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
    console.error("createMadrassa insert error:", insertError);
    return {
      success: false,
      error: "Something went wrong while managing the Madrassa. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true, message: `Madrassa "${name}" created successfully.` };
}

/**
 * Toggles a madrassa's active status.
 *
 * NOTE: signature changed from `(id, currentStatus)` to `(id)`. The previous
 * version flipped `is_active` based on whatever status the *client* last
 * rendered, which is a TOCTOU race: two open tabs, a stale dashboard fetch,
 * or a double-click could flip the status the wrong way with no error. This
 * version reads the authoritative current value from the DB and writes the
 * flip with an optimistic-lock `.eq("is_active", ...)` guard, so a
 * concurrent change between the read and the write causes this update to
 * affect zero rows instead of clobbering someone else's change.
 */
export async function toggleMadrassaStatus(id: string): Promise<ActionResult> {
  const session = await verifySuperAdminSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (!id) {
    return { success: false, error: "Invalid Madrassa ID." };
  }

  const { data: current, error: fetchError } = await supabase
    .from("madrassas")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    console.error("toggleMadrassaStatus fetch error:", fetchError);
    return { success: false, error: "Madrassa not found." };
  }

  const previousStatus = (current as any).is_active as boolean;
  const newStatus = !previousStatus;

  const { data: updated, error } = await supabase
    .from("madrassas")
    .update({ is_active: newStatus })
    .eq("id", id)
    .eq("is_active", previousStatus) // optimistic lock: no-ops if status changed since the read above
    .select("id");

  if (error) {
    console.error("toggleMadrassaStatus error:", error);
    return {
      success: false,
      error: "Something went wrong while managing the Madrassa. Please try again.",
    };
  }

  if (!updated || updated.length === 0) {
    return {
      success: false,
      error: "This Madrassa's status just changed elsewhere — please refresh and try again.",
    };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: `Madrassa ${newStatus ? "activated" : "deactivated"} successfully.`,
  };
}

export async function getAllMadrassas(): Promise<{
  data: MadrassaRow[] | null;
  error: string | null;
}> {
  const session = await verifySuperAdminSession();
  if (!session) {
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("madrassas")
    .select("id, name, register_number, subdomain, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllMadrassas error:", error);
    return {
      data: null,
      error: "Something went wrong while managing the Madrassa. Please try again.",
    };
  }

  return { data: data as MadrassaRow[], error: null };
}
