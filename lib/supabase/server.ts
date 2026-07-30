import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'
import { verifySession } from '@/app/(tenant)/admin/actions/auth-actions'

/**
 * Server-side Supabase client.
 *
 * Use in:
 *  - Server Components  (async functions that return JSX)
 *  - Server Actions     ('use server' functions)
 *  - Route Handlers     (GET / POST handlers in app/api/*)
 *
 * Must be called inside a request context so `next/headers` cookies() works.
 *
 * The cookie handlers below keep the auth session in sync:
 *  - getAll  → reads cookies from the incoming request
 *  - setAll  → writes updated tokens back to the response
 *
 * NOTE: In Server Components `setAll` will attempt to write cookies.
 * Next.js silently ignores writes in pure render paths, so this is safe.
 * Actual writes happen through middleware and Server Actions.
 *
 * DEFENSE IN DEPTH: After the client is created, if a valid admin session
 * exists (custom JWT, verified via verifySession()), its madrassa_id is
 * pushed into the Postgres session as `app.current_madrassa_id` via
 * set_config. RLS policies that key off current_madrassa_id() then enforce
 * tenant isolation at the database layer, independent of any application
 * code correctly scoping .eq("madrassa_id", ...) on every query.
 */
export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component render — safe to ignore.
            // Middleware handles the actual token refresh.
          }
        },
      },
    },
  )

  // After creating `client`:
  try {
    const session = await verifySession()

    if (session?.madrassa_id) {
      const untypedClient = client as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>
      }
      await untypedClient.rpc('set_config', {
        setting_name: 'app.current_madrassa_id',
        new_value: session.madrassa_id,
        is_local: true,
      })
    }
  } catch (error) {
    console.error('createClient: failed to set tenant RLS context:', error)
  }

  return client
}
