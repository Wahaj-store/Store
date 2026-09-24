import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { hashPassword, verifyPassword } from './auth';
import { normalizePhone } from './security';

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET غير مضبوط');
  return new TextEncoder().encode(s);
}

export async function createCustomerSession(id: string) {
  const token = await new SignJWT({ sub: id, aud: 'customer', typ: 'customer-session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
  
  cookies().set('wahaj_customer', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCustomer() {
  const token = cookies().get('wahaj_customer')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: 'customer' });
    if (!payload.sub) return null;
    return prisma.customer.findUnique({ where: { id: String(payload.sub) } });
  } catch {
    return null;
  }
}

export async function customerRegister(data: { name: string; phone: string; email?: string; password: string }) {
  const phone = normalizePhone(data.phone);
  const exists = await prisma.customer.findUnique({ where: { phone } });
  if (exists) throw new Error('رقم الهاتف مسجل بالفعل');
  
  const c = await prisma.customer.create({
    data: {
      name: data.name.trim(),
      phone,
      email: data.email?.trim().toLowerCase() || null,
      passwordHash: await hashPassword(data.password),
    },
  });
  
  await createCustomerSession(c.id);
  return c;
}

export async function customerLogin(rawPhone: string, password: string) {
  const phone = normalizePhone(rawPhone);
  
  // البحث عن المستخدم برقم الهاتف
  const c = await prisma.customer.findUnique({ where: { phone } });
  
  if (!c || !c.passwordHash) {
    throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
  }

  // التحقق من صحة كلمة المرور المقارنة مع الحقل المشفر
  const isValid = await verifyPassword(password, c.passwordHash);
  if (!isValid) {
    throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
  }

  // تحديث وقت آخر تسجيل دخول وتوليد الجلسة
  await prisma.customer.update({
    where: { id: c.id },
    data: { lastLoginAt: new Date() },
  });

  await createCustomerSession(c.id);
  return c;
}
