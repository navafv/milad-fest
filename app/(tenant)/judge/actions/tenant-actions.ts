"use server";

import { headers, cookies } from "next/headers";

/**
 * Resolves the active tenant's subdomain for PUBLIC/unauthenticated pages
 * (like the judge login screen), using the `x-madrassa-subdomain` header
 * set by middleware from either `?tenant=xyz` or the `active_tenant`
 * cookie — never from a route param, since this app has no
 * `[subdomain]` dynamic segment.
 */
export async function getActiveTenantSubdomain(): Promise<string> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-madrassa-subdomain");
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  return cookieStore.get("active_tenant")?.value ?? "";
}