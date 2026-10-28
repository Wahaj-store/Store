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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api') && !isSameOriginMutation(req)) {
    return applySecurityHeaders(csrfDeniedResponse());
  }

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && !PUBLIC_ADMIN_APIS.includes(pathname);

  // Enforce maintenance for storefront pages and public APIs, but never block
  // the admin dashboard, its authentication endpoints, or public settings.
  if (!isMaintenanceExempt(pathname) && !(pathname.startsWith('/_next/')) && !pathname.startsWith('/api/admin')) {
    const maintenanceEnabled = await isMaintenanceEnabled(req);
    if (maintenanceEnabled) {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(NextResponse.json(
          { error: 'المتجر في وضع الصيانة حاليًا. يرجى المحاولة لاحقًا.' },
          { status: 503, headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' } },
        ));
      }
      const maintenanceUrl = req.nextUrl.clone();
      maintenanceUrl.pathname = '/maintenance';
      maintenanceUrl.search = '';
      const response = NextResponse.rewrite(maintenanceUrl);
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      applySecurityHeaders(response);
      return response;
    }
  }

  if (!isAdminPage && !isAdminApi) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const secretValue = process.env.AUTH_SECRET;
  const token = req.cookies.get('wahaj_session')?.value;

  const deny = () => {
    if (isAdminApi) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }
    return applySecurityHeaders(NextResponse.redirect(new URL('/admin/login', req.url)));
  };

  if (!secretValue || secretValue.length < 32 || !token) return deny();

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretValue), { audience: 'admin' });
    // Accept only tokens issued by createSession for an identified admin user.
    // A valid signature/audience alone is not sufficient to establish this session type.
    if (payload.typ !== 'admin-session' || typeof payload.sub !== 'string' || !payload.sub || typeof payload.iat !== 'number') {
      return deny();
    }
    const headers = new Headers(req.headers);
    if (!headers.get('x-request-id')) {
      headers.set('x-request-id', globalThis.crypto.randomUUID());
    }
    const response = NextResponse.next({ request: { headers } });
    applySecurityHeaders(response);
    return response;
  } catch {
    return deny();
  }
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  // Start in report-only mode so legitimate Next.js and store assets are not blocked.
  response.headers.set(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:",
  );
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=15552000');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
