import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export class TenantAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "TenantAuthError";
    this.status = status;
  }
}

/**
 * Verifies that the currently authenticated user is authorized to act on
 * behalf of the given madrassaId (tenant). Throws a TenantAuthError (403)
 * if the user's session madrassa_id does not match the requested one, or
 * if there is no valid session at all (401).
 *
 * Resolution order:
 * 1. Supabase auth session -> user_metadata.madrassa_id / app_metadata.madrassa_id
 * 2. Supabase `profiles` table lookup (fallback, in case metadata is stale)
 * 3. HTTP-only cookie `madrassa_id` (fallback for custom session handling)
 */
export async function verifyTenantAccess(madrassaId: string): Promise<void> {
  if (!madrassaId) {
    throw new TenantAuthError("Missing madrassaId for tenant verification.", 400);
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new TenantAuthError("Unauthorized: no active session.", 401);
  }

  let sessionMadrassaId: string | null =
    (user.app_metadata?.madrassa_id as string | undefined) ??
    (user.user_metadata?.madrassa_id as string | undefined) ??
    null;

  if (!sessionMadrassaId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("madrassa_id")
      .eq("id", user.id)
      .single();

    if (!profileError && profile?.madrassa_id) {
      sessionMadrassaId = profile.madrassa_id as string;
    }
  }

  if (!sessionMadrassaId) {
    const cookieStore = await cookies();
    const cookieMadrassaId = cookieStore.get("madrassa_id")?.value;
    if (cookieMadrassaId) {
      sessionMadrassaId = cookieMadrassaId;
    }
  }

  if (!sessionMadrassaId) {
    throw new TenantAuthError(
      "Unauthorized: unable to resolve tenant for current session.",
      403
    );
  }

  if (sessionMadrassaId !== madrassaId) {
    throw new TenantAuthError(
      "Forbidden: you do not have access to this madrassa's resources.",
      403
    );
  }
}
