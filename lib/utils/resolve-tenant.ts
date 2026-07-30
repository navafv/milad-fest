import "server-only";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Resolves the active tenant's madrassa_id for PUBLIC (unauthenticated)
 * pages, using the `x-madrassa-subdomain` header set by middleware from
 * either `?tenant=xyz` or the `active_tenant` cookie.
 *
 * Returns null if the subdomain is missing, unknown, or the madrassa has
 * been deactivated — callers should render a "not found" state in that case
 * rather than querying with an undefined/empty madrassaId.
 */
export async function resolvePublicMadrassaId(): Promise<string | null> {
  const headerStore = await headers();
  const subdomain = headerStore.get("x-madrassa-subdomain");
  if (!subdomain) return null;

  const { data, error } = await supabase
    .from("madrassas")
    .select("id, is_active")
    .eq("subdomain", subdomain)
    .single();

  if (error || !data || !(data as any).is_active) return null;

  return (data as any).id;
}