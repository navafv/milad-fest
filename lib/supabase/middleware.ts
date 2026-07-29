import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'

/**
 * Creates a Supabase client that can read and write cookies inside
 * Next.js middleware, then refreshes the user's auth session.
 *
 * Returns both the updated `response` (with refreshed Set-Cookie headers)
 * and the resolved `user` object (null if unauthenticated).
 *
 * Usage in middleware.ts:
 *
 *   const { response, user } = await updateSession(request, nextResponse)
 *
 * Always return `response` from your middleware so the refreshed cookies
 * are forwarded to the browser.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; user: { id: string; email?: string } | null }> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the mutated request and the outgoing response
          // so that downstream Server Components see the refreshed tokens.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // getUser() validates the JWT and triggers a token refresh when needed.
  // Do NOT use getSession() here — it trusts the cookie without server validation.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
