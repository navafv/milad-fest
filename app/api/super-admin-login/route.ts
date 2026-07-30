import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 1. Get the exact secret the server is using
  const secret = new TextEncoder().encode(process.env.SUPER_ADMIN_JWT_SECRET);
  
  // 2. Generate the token exactly how the server expects it
  const token = await new SignJWT({ 
    role: "super_admin", 
    superAdminId: "master-admin-001" 
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  // 3. Securely set the HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set("super_admin_session", token, {
    path: "/",
    httpOnly: true, // Much more secure than setting it via browser console
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // 4. Redirect directly to your dashboard!
  return NextResponse.redirect(new URL("/dashboard", request.url));
}