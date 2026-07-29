"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SESSION_COOKIE = "madrassa_session";
const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET ?? "change-me-in-production-32chars!!");

export type SessionPayload = {
  madrassa_id: string;
  role: "admin";
};

export type AuthResult =
  | { success: true }
  | { success: false; error: string };

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function loginTenantAdmin(formData: FormData): Promise<AuthResult> {
  const register_number = (formData.get("register_number") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();

  if (!register_number || !password) {
    return { success: false, error: "Register Number and Password are required." };
  }

  // Read subdomain injected by middleware
  const headerStore = await headers();
  const subdomain = headerStore.get("x-madrassa-subdomain");

  if (!subdomain) {
    return { success: false, error: "Could not determine Madrassa context." };
  }

  const { data: madrassa, error } = await supabase
    .from("madrassas")
    .select("id, register_number, password_hash, is_active")
    .eq("subdomain", subdomain)
    .eq("register_number", register_number)
    .single();

  if (error || !madrassa) {
    return { success: false, error: "Invalid credentials." };
  }

  if (!madrassa.is_active) {
    return { success: false, error: "This Madrassa account has been deactivated." };
  }

  const valid = await bcrypt.compare(password, madrassa.password_hash);
  if (!valid) {
    return { success: false, error: "Invalid credentials." };
  }

  const token = await signSession({ madrassa_id: madrassa.id, role: "admin" });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect("/admin/dashboard");
}

export async function logoutTenantAdmin(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  redirect("/admin/login");
}
