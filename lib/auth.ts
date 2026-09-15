import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { prisma } from './prisma';

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must be configured with at least 32 characters');
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  if (!password || password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise<string>((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(`s2$${salt}$${key.toString('hex')}`)));
}

export async function verifyPassword(password: string, stored: string) {
  try {
    if (stored.startsWith('s2$')) {
      const [, salt, hex] = stored.split('$');
      const derived = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key)));
      const expected = Buffer.from(hex, 'hex');
      return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
    }
    // Backward compatibility for V6 hashes; new passwords always use s2.
    const legacy = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, 'wahaj-salt', 64, (e, key) => e ? reject(e) : resolve(key)));
    const expected = Buffer.from(stored, 'hex');
    return expected.length === legacy.length && crypto.timingSafeEqual(expected, legacy);
  } catch { return false; }
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId, aud: 'admin', typ: 'admin-session' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(getSecret());
  cookies().set('wahaj_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}

export async function getUser() {
  const token = cookies().get('wahaj_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: 'admin' });
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user?.active) return null;
    return user;
  } catch { return null; }
}

export async function requireUser(roles?: string[]) {
  const user = await getUser();
  if (!user || !user.active) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

export async function clearSession() { cookies().delete('wahaj_session'); }
