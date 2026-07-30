import "server-only";
import { verifySession } from "@/app/(tenant)/admin/actions/auth-actions";
import { getCurrentJudgeSession } from "@/app/(tenant)/judge/actions/judge-actions";

export class TenantAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "TenantAuthError";
    this.status = status;
  }
}

/**
 * Verifies that the currently authenticated ADMIN user has a valid custom
 * app session and is authorized to act on behalf of the given madrassaId
 * (tenant).
 *
 * Throws:
 * - TenantAuthError (400) if madrassaId is missing.
 * - TenantAuthError (401) if there is no valid admin session.
 * - TenantAuthError (403) if the session's madrassa_id does not match the
 *   requested madrassaId.
 *
 * Returns the verified session so callers can access admin/user details
 * without re-fetching it.
 */
export async function requireAdminSession(madrassaId: string) {
  if (!madrassaId) {
    throw new TenantAuthError("Missing madrassaId for tenant verification.", 400);
  }

  const session = await verifySession();

  if (!session) {
    throw new TenantAuthError("Unauthorized: no active admin session.", 401);
  }

  const sessionMadrassaId = session.madrassa_id;

  if (!sessionMadrassaId) {
    throw new TenantAuthError(
      "Unauthorized: unable to resolve tenant for current admin session.",
      401
    );
  }

  if (sessionMadrassaId !== madrassaId) {
    throw new TenantAuthError(
      "Forbidden: you do not have access to this madrassa's resources.",
      403
    );
  }

  return session;
}

/**
 * Verifies that the currently authenticated JUDGE user has a valid custom
 * app session and is authorized to act on behalf of the given madrassaId
 * (tenant).
 *
 * Throws:
 * - TenantAuthError (400) if madrassaId is missing.
 * - TenantAuthError (401) if there is no valid judge session.
 * - TenantAuthError (403) if the session's madrassa_id does not match the
 *   requested madrassaId.
 *
 * Returns the verified session so callers can access judge details without
 * re-fetching it.
 */
export async function requireJudgeSession(madrassaId: string) {
  if (!madrassaId) {
    throw new TenantAuthError("Missing madrassaId for tenant verification.", 400);
  }

  const session = await getCurrentJudgeSession();

  if (!session) {
    throw new TenantAuthError("Unauthorized: no active judge session.", 401);
  }

  const sessionMadrassaId = session.madrassaId;

  if (!sessionMadrassaId) {
    throw new TenantAuthError(
      "Unauthorized: unable to resolve tenant for current judge session.",
      401
    );
  }

  if (sessionMadrassaId !== madrassaId) {
    throw new TenantAuthError(
      "Forbidden: you do not have access to this madrassa's resources.",
      403
    );
  }

  return session;
}
