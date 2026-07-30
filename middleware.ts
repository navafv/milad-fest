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

/**
 * Header used internally to forward the resolved subdomain to Server
 * Components / Route Handlers. This header is ALWAYS derived fresh from
 * request.nextUrl.hostname / the Host header below — it is NEVER read
 * from an incoming client-supplied value. Any client-supplied copy of
 * this header (or of x-forwarded-host) is stripped before we set our
 * own, so a request cannot spoof its own tenant routing.
 */
const TENANT_HEADER = 'x-madrassa-subdomain'

/** Session cookie names — presence-only checks; real verification happens
 * in Server Components / Server Actions via verifySession() /
 * getCurrentJudgeSession() / verifySuperAdminSession(). This middleware
 * guard exists purely to bounce obviously-unauthenticated requests away
 * from protected sections before they render, not as the source of truth
 * for authorization. */
const ADMIN_SESSION_COOKIE = 'madrassa_session'
const JUDGE_SESSION_COOKIE = 'judge_session'
const SUPER_ADMIN_SESSION_COOKIE = 'super_admin_session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Given a request hostname, returns:
 *  - { type: 'root' }                       — super-admin traffic
 *  - { type: 'tenant', subdomain: string }  — madrassa tenant traffic
 *  - { type: 'unknown' }                    — unrecognised host (pass-through)
 *
 * SECURITY: hostname must come from request.nextUrl.hostname or the
 * standard `host` header only — see getTrustedHostname() below. Never
 * pass in x-forwarded-host or any other client-controllable header here.
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

/**
 * Returns the hostname to trust for routing decisions.
 *
 * SECURITY: We deliberately use `request.nextUrl.hostname`, which Next.js
 * derives from the actual connection info, NOT from re-parsing a
 * client-controllable header. We fall back to the standard `host` header
 * only if nextUrl.hostname is somehow empty (defensive, should not happen
 * in practice). We explicitly never read `x-forwarded-host` — on Vercel /
 * most reverse-proxy setups that header can be influenced by the client
 * unless the edge/proxy layer is configured to strip and re-set it, so
 * treating it as authoritative for tenant resolution would let an
 * attacker route themselves into another tenant's rewritten pages or
 * spoof which tenant's cookies/context get attached to their request.
 */
function getTrustedHostname(request: NextRequest): string {
  if (request.nextUrl.hostname) {
    return request.nextUrl.hostname
  }
  const hostHeader = request.headers.get('host') ?? ''
  // Strip port if present, mirroring nextUrl.hostname's behavior is not
  // required here since classifyHost() compares against full host:port
  // constants for dev and bare hostnames for prod — keep as-is.
  return hostHeader
}

/**
 * Strips any client-supplied copy of headers we treat as internal/trusted
 * so a request can never smuggle a spoofed value through to Server
 * Components. Call this before we set our own derived values.
 */
function stripSpoofableHeaders(headers: Headers): void {
  headers.delete(TENANT_HEADER)
  headers.delete('x-forwarded-host')
}

function hasCookie(request: NextRequest, name: string): boolean {
  return Boolean(request.cookies.get(name)?.value)
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Resolve hostname strictly from trusted, non-spoofable sources.
  const hostname = getTrustedHostname(request)
  const classification = classifyHost(hostname)

  // Always strip any client-supplied spoof attempts before we decide what
  // (if anything) to set ourselves. This applies regardless of branch.
  stripSpoofableHeaders(request.headers)

  // ── 1. Build the base response with the correct rewrite / pass-through ──

  let response: NextResponse

  if (classification.type === 'root') {
    // Super-admin traffic — no rewrite needed; Next.js serves /app/(superadmin)/...

    // ── Basic guard: /super-admin routes require a session cookie ──
    if (pathname.startsWith('/super-admin') && pathname !== '/super-admin/login') {
      if (!hasCookie(request, SUPER_ADMIN_SESSION_COOKIE)) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/super-admin/login'
        loginUrl.search = ''
        return NextResponse.redirect(loginUrl)
      }
    }

    response = NextResponse.next({
      request,
    })
  } else if (classification.type === 'tenant') {
    const { subdomain } = classification

    // ── Basic guards: /admin and /judge routes require a session cookie ──
    // Checked against the ORIGINAL (pre-rewrite) pathname, since that is
    // what the browser actually requested (e.g.
    // thahvaremilad.localhost:3000/admin/events).
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      if (!hasCookie(request, ADMIN_SESSION_COOKIE)) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        loginUrl.search = ''
        return NextResponse.redirect(loginUrl)
      }
    }

    if (pathname.startsWith('/judge') && pathname !== '/judge/login') {
      if (!hasCookie(request, JUDGE_SESSION_COOKIE)) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/judge/login'
        loginUrl.search = ''
        return NextResponse.redirect(loginUrl)
      }
    }

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
    // Route Handlers can read it without re-parsing the host. This is
    // derived exclusively from the trusted hostname above — never from
    // any header the client sent us.
    response.headers.set(TENANT_HEADER, subdomain)
    request.headers.set(TENANT_HEADER, subdomain)
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
