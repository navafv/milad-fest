import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Header used internally to forward the resolved tenant to Server
 * Components / Route Handlers. 
 */
const TENANT_HEADER = 'x-madrassa-subdomain'

/** Session cookie names — presence-only checks for routing guards */
const ADMIN_SESSION_COOKIE = 'madrassa_session'
const JUDGE_SESSION_COOKIE = 'judge_session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasCookie(request: NextRequest, name: string): boolean {
  return Boolean(request.cookies.get(name)?.value)
}

/**
 * Strips any client-supplied copy of headers we treat as internal/trusted
 * so a request can never smuggle a spoofed value through to Server Components.
 */
function stripSpoofableHeaders(headers: Headers): void {
  headers.delete(TENANT_HEADER)
  headers.delete('x-forwarded-host')
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const { pathname } = url

  // 1. Strip spoofable headers for security
  stripSpoofableHeaders(request.headers)

  // 2. Basic Route Guards
  // Bounce unauthenticated users away from protected routes before rendering
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!hasCookie(request, ADMIN_SESSION_COOKIE)) {
      const loginUrl = url.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/judge') && pathname !== '/judge/login') {
    if (!hasCookie(request, JUDGE_SESSION_COOKIE)) {
      const loginUrl = url.clone()
      loginUrl.pathname = '/judge/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Resolve the Tenant (The Magic Trick!)
  // Look for the tenant in the URL (?tenant=xyz) OR the saved browser cookie
  const tenantFromUrl = url.searchParams.get('tenant')
  const tenantFromCookie = request.cookies.get('active_tenant')?.value
  
  const activeTenant = tenantFromUrl || tenantFromCookie

  // Inject the tenant into the request headers so Server Components can read it
  if (activeTenant) {
    request.headers.set(TENANT_HEADER, activeTenant)
  }

  // 4. Refresh Supabase auth session
  // We pass the modified request into Supabase so it persists our new headers
  let response = NextResponse.next({ request })
  
  try {
    const { response: responseWithSession } = await updateSession(request, response)
    response = responseWithSession
  } catch (error) {
    console.error("Supabase updateSession failed:", error)
  }

  // 5. Attach Tenant Cookie & Headers to the final response
  if (activeTenant) {
    response.headers.set(TENANT_HEADER, activeTenant)
    
    // If they clicked a link with ?tenant=xyz, save it to a cookie instantly!
    // Now they can click around the app without needing ?tenant in the URL.
    if (tenantFromUrl) {
      response.cookies.set('active_tenant', activeTenant, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // Remember for 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
  }

  return response
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Run middleware on every route EXCEPT:
 *  - Next.js internals (_next/static, _next/image)
 *  - favicon and static public assets
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|eot)$).*)',
  ],
}
