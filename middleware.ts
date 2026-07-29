import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── Constants ────────────────────────────────────────────────────────────────

/** The bare root hostname (no subdomain) for production. */
const ROOT_HOSTNAME_PROD = 'miladnabi.vercel.app'

/**
 * Base domain used to extract subdomains in production.
 * e.g. "thahvaremilad.vercel.app" → strip ".vercel.app" → "thahvaremilad"
 */
const ROOT_DOMAIN_PROD = '.vercel.app'

/** Local dev base domain (port included). */
const ROOT_DOMAIN_DEV = '.localhost:3000'

/** The bare root host for local dev — no subdomain. */
const ROOT_HOSTNAME_DEV = 'localhost:3000'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Given a request hostname, returns:
 *  - { type: 'root' }                       — super-admin traffic
 *  - { type: 'tenant', subdomain: string }  — madrassa tenant traffic
 *  - { type: 'unknown' }                    — unrecognised host (pass-through)
 */
function classifyHost(
  hostname: string,
): { type: 'root' } | { type: 'tenant'; subdomain: string } | { type: 'unknown' } {
  if (isDev()) {
    // Local: "localhost:3000" → root
    if (hostname === ROOT_HOSTNAME_DEV) return { type: 'root' }

    // Local: "thahvaremilad.localhost:3000" → tenant
    if (hostname.endsWith(ROOT_DOMAIN_DEV)) {
      const subdomain = hostname.slice(0, -ROOT_DOMAIN_DEV.length)
      if (subdomain) return { type: 'tenant', subdomain }
    }
  } else {
    // Production: "miladnabi.vercel.app" → root
    if (hostname === ROOT_HOSTNAME_PROD) return { type: 'root' }

    // Production: "thahvaremilad.vercel.app" → tenant
    if (hostname.endsWith(ROOT_DOMAIN_PROD)) {
      const subdomain = hostname.slice(0, -ROOT_DOMAIN_PROD.length)
      // Make sure we didn't just match the root itself
      if (subdomain && subdomain !== 'miladnabi') {
        return { type: 'tenant', subdomain }
      }
    }
  }

  return { type: 'unknown' }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  const classification = classifyHost(hostname)

  // ── 1. Build the base response with the correct rewrite / pass-through ──

  let response: NextResponse

  if (classification.type === 'root') {
    // Super-admin traffic — no rewrite needed; Next.js serves /app/(superadmin)/...
    // Just let the request fall through unchanged.
    response = NextResponse.next({
      request,
    })
  } else if (classification.type === 'tenant') {
    const { subdomain } = classification

    // Rewrite the URL so that /app/(tenant)/... pages are served while the
    // browser URL stays clean (e.g. thahvaremilad.localhost:3000/dashboard).
    //
    // Convention: tenant pages live under /app/[tenant]/... in the file system.
    // The rewrite prefixes the pathname with /tenant/<subdomain>.
    //
    // Example:
    //   Browser:  thahvaremilad.localhost:3000/dashboard
    //   Internal: localhost:3000/tenant/thahvaremilad/dashboard

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/tenant/${subdomain}${pathname}`

    response = NextResponse.rewrite(rewriteUrl, { request })

    // Inject subdomain into a request header so Server Components and
    // Route Handlers can read it without re-parsing the host.
    response.headers.set('x-madrassa-subdomain', subdomain)

    // Also forward to the rewritten request headers so layout/page RSC can read it.
    // (Next.js propagates response headers set before the rewrite to the internal fetch.)
    request.headers.set('x-madrassa-subdomain', subdomain)
  } else {
    // Unknown host — pass through without interference.
    response = NextResponse.next({ request })
  }

  // ── 2. Refresh Supabase auth session and merge updated cookies ──────────

  const { response: responseWithSession } = await updateSession(request, response)

  return responseWithSession
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Run middleware on every route EXCEPT:
 *  - Next.js internals (_next/static, _next/image)
 *  - favicon and static public assets
 *
 * The negative lookahead keeps middleware off asset requests for performance.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|eot)$).*)',
  ],
}
