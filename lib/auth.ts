import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { can, type Permission } from './rbac';
export { hashPassword, verifyPassword } from './password';
let cachedSecret: Uint8Array | null = null;

function getSecret() {
  if (cachedSecret) return cachedSecret;
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters');
  }
  cachedSecret = new TextEncoder().encode(value);
  return cachedSecret;
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId, aud: 'admin', typ: 'admin-session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
  (await cookies()).set('wahaj_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUser() {
  const token = (await cookies()).get('wahaj_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: 'admin' });
    if (payload.typ !== 'admin-session' || typeof payload.sub !== 'string' || !payload.sub || typeof payload.iat !== 'number') return null;

    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user?.active) return null;

    // إذا تم تغيير كلمة المرور بعد إصدار التوكن → ارفض الجلسة
    if (user.passwordChangedAt) {
      const tokenIssuedAtMs = payload.iat * 1000;
      if (tokenIssuedAtMs < user.passwordChangedAt.getTime()) return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireUser(roles?: string[]) {
  const user = await getUser();
  if (!user || !user.active) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

/**
 * Authentication + permission lookup for API routes.
 * Returns a small result object so callers can preserve the correct 401/403
 * distinction without duplicating role arrays.
 */
export async function requirePermission(permission: Permission) {
  const user = await getUser();
  if (!user || !user.active) return { user: null, status: 401 as const };
  if (!can(user.role, permission)) return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}

export async function clearSession() {
  (await cookies()).delete('wahaj_session');
}
