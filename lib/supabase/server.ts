import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

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
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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
}
