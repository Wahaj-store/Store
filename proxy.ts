import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isSameOriginMutation, csrfDeniedResponse } from '@/lib/csrf';
import { createMaintenanceStatusCache } from '@/lib/maintenance-status-cache';

// مسارات API إدارية عامة (لا تحتاج جلسة)
const PUBLIC_ADMIN_APIS = ['/api/admin/login', '/api/admin/logout'];
const MAINTENANCE_EXEMPT_PATHS = [
  '/maintenance',
  '/admin',
  '/api/admin',
  '/api/auth',
  '/api/settings',
];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PRIVATE_API_PREFIXES = ['/api/admin', '/api/customer', '/api/auth'];
const PRIVATE_API_PATHS = new Set(['/api/returns']);

function isPrivateApiPath(pathname: string) {
  return PRIVATE_API_PATHS.has(pathname) || PRIVATE_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isMaintenanceExempt(pathname: string) {
  return MAINTENANCE_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

const readCachedMaintenanceStatus = createMaintenanceStatusCache({
  successTtlMs: 5_000,
  failureTtlMs: 1_000,
});

async function isMaintenanceEnabled(req: NextRequest): Promise<boolean> {
  return readCachedMaintenanceStatus(async () => {
    // This endpoint is under the exempt /api/settings path, so it cannot recurse.
    const settingsUrl = new URL('/api/settings/maintenance', req.url);
    const response = await fetch(settingsUrl, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Maintenance settings are unavailable');
    const payload = await response.json();
    const value = payload?.maintenanceMode;
    return value === true || String(value).trim().toLowerCase() === 'true';
  });
}

function createContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "connect-src 'self' https: wss:",
  ].join('; ');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = btoa(globalThis.crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  requestHeaders.set('x-csp-nonce', nonce);

  // Browser-facing API mutations must provide Origin or Referer and match the
  // request origin. Only scheduled server-to-server cron calls may omit both.
  // Keep this check outside isSameOriginMutation so it remains compatible with
  // versions of that helper whose signature accepts only the Request argument.
  if (pathname.startsWith('/api')) {
    const isCronApi = pathname === '/api/cron' || pathname.startsWith('/api/cron/');
    const isMutation = !SAFE_METHODS.has(req.method.toUpperCase());
    const hasOriginOrReferer = Boolean(
      req.headers.get('origin') || req.headers.get('referer'),
    );

    if (isMutation && !isCronApi && !hasOriginOrReferer) {
      return applySecurityHeaders(csrfDeniedResponse(), pathname, contentSecurityPolicy);
    }

    if (!isSameOriginMutation(req)) {
      return applySecurityHeaders(csrfDeniedResponse(), pathname, contentSecurityPolicy);
    }
  }

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && !PUBLIC_ADMIN_APIS.includes(pathname);

  // Enforce maintenance for storefront pages and public APIs, but never block
  // the admin dashboard, its authentication endpoints, or public settings.
  if (!isMaintenanceExempt(pathname) && !pathname.startsWith('/_next/') && !pathname.startsWith('/api/admin')) {
    const maintenanceEnabled = await isMaintenanceEnabled(req);
    if (maintenanceEnabled) {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(NextResponse.json(
          { error: 'المتجر في وضع الصيانة حاليًا. يرجى المحاولة لاحقًا.' },
          { status: 503, headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' } },
        ), pathname, contentSecurityPolicy);
      }
      const maintenanceUrl = req.nextUrl.clone();
      maintenanceUrl.pathname = '/maintenance';
      maintenanceUrl.search = '';
      const response = NextResponse.rewrite(maintenanceUrl, { request: { headers: requestHeaders } });
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      applySecurityHeaders(response, pathname, contentSecurityPolicy);
      return response;
    }
  }

  if (!isAdminPage && !isAdminApi) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(response, pathname, contentSecurityPolicy);
    return response;
  }

  const secretValue = process.env.AUTH_SECRET;
  const token = req.cookies.get('wahaj_session')?.value;
  const deny = () => {
    if (isAdminApi) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), pathname, contentSecurityPolicy);
    }
    return applySecurityHeaders(NextResponse.redirect(new URL('/admin/login', req.url)), pathname, contentSecurityPolicy);
  };

  if (!secretValue || secretValue.length < 32 || !token) return deny();

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretValue), {
      audience: 'admin',
      algorithms: ['HS256'],
    });
    // Accept only tokens issued by createSession for an identified admin user.
    // A valid signature/audience alone is not sufficient to establish this session type.
    if (
      payload.typ !== 'admin-session' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= payload.iat
    ) {
      return deny();
    }
    const headers = new Headers(requestHeaders);
    if (!headers.get('x-request-id')) {
      headers.set('x-request-id', globalThis.crypto.randomUUID());
    }
    const response = NextResponse.next({ request: { headers } });
    applySecurityHeaders(response, pathname, contentSecurityPolicy);
    return response;
  } catch {
    return deny();
  }
}

function applySecurityHeaders(response: NextResponse, pathname: string | undefined, contentSecurityPolicy: string) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  if (pathname && isPrivateApiPath(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=15552000');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
