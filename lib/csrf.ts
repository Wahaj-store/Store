import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Browser CSRF guard for cookie-authenticated mutations.
 * Requests without Origin/Referer are allowed for server-to-server clients;
 * browsers send one of them for normal cross-origin form/fetch requests.
 */
export function isSameOriginMutation(
  request: Request,
  options: { allowMissingOrigin?: boolean } = {},
) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return options.allowMissingOrigin !== false;

  const allowedOrigins = new Set<string>();
  try {
    allowedOrigins.add(new URL(request.url).origin);
  } catch {
    return false;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      allowedOrigins.add(new URL(configured).origin);
    } catch {
      // Ignore malformed optional configuration and keep the request origin.
    }
  }

  const candidate = origin || referer;
  if (!candidate) return true;
  try {
    return allowedOrigins.has(new URL(candidate).origin);
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
