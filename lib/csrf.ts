import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Browser CSRF guard for cookie-authenticated mutations.
 * Requests without Origin/Referer are allowed for server-to-server clients;
 * browsers send one of them for normal cross-origin form/fetch requests.
 */
export function isSameOriginMutation(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return true;

  const requestUrl = new URL(request.url);
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  const allowedHosts = new Set([requestUrl.host]);
  if (configured) {
    try {
      allowedHosts.add(new URL(configured).host);
    } catch {
      // Ignore malformed optional configuration and keep the request host.
    }
  }

  const candidate = origin || referer;
  try {
    return allowedHosts.has(new URL(candidate!).host);
  } catch {
    return false;
  }
}

export function csrfDeniedResponse() {
  return NextResponse.json(
    { error: 'مصدر الطلب غير مصرح به.' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}
