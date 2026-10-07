import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isSameOriginMutation, csrfDeniedResponse } from '@/lib/csrf';

// مسارات API إدارية عامة (لا تحتاج جلسة)
// ⚠️ إذا كان مسار تسجيل الدخول عندك مختلفًا، أضفه هنا
const PUBLIC_ADMIN_APIS = ['/api/admin/login', '/api/admin/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api') && !isSameOriginMutation(req)) return csrfDeniedResponse();

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && !PUBLIC_ADMIN_APIS.includes(pathname);

  if (!isAdminPage && !isAdminApi) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const secretValue = process.env.AUTH_SECRET;
  const token = req.cookies.get('wahaj_session')?.value;

  const deny = () => {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  };

  if (!secretValue || secretValue.length < 32 || !token) return deny();

  try {
    await jwtVerify(token, new TextEncoder().encode(secretValue), { audience: 'admin' });

    // إضافة x-request-id لكل طلب إداري (للتتبع)
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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
