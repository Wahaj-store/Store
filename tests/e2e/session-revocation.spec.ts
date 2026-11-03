import { PrismaClient, Role } from '@prisma/client';
import { SignJWT } from 'jose';
import { expect, test } from '@playwright/test';

const prisma = new PrismaClient();
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
const authSecret = process.env.AUTH_SECRET || 'ci-only-auth-secret-do-not-use-outside-tests';

async function createSessionToken(subject: string, audience: 'admin' | 'customer') {
  return new SignJWT({
    typ: `${audience}-session`,
    sv: 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(authSecret));
}

test('admin logout revokes a copied session token on protected APIs', async ({ browser }) => {
  const email = `admin-session-${Date.now()}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'unused-e2e-password-hash',
      role: Role.ADMIN,
    },
  });
  const token = await createSessionToken(user.id, 'admin');
  const context = await browser.newContext();

  try {
    await context.addCookies([{
      name: 'wahaj_session',
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    const adminSession = await context.request.get(`${baseUrl}/api/auth/me`);
    expect(adminSession.status()).toBe(200);
    expect(adminSession.headers()['cache-control']).toContain('no-store');

    const logout = await context.request.post(`${baseUrl}/api/admin/logout`, {
      headers: { origin: baseUrl },
      maxRedirects: 0,
    });
    expect(logout.status()).toBe(303);
    expect(logout.headers()['cache-control']).toContain('no-store');

    // Simulate a copied cookie that an attacker retained before logout.
    await context.addCookies([{
      name: 'wahaj_session',
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    expect((await context.request.get(`${baseUrl}/api/auth/me`)).status()).toBe(401);
  } finally {
    await context.close();
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('customer logout revokes a copied session token on customer APIs', async ({ browser }) => {
  const phone = `+2010${Date.now().toString().slice(-8)}`;
  const customer = await prisma.customer.create({
    data: { name: 'عميل اختبار الجلسة', phone },
  });
  const token = await createSessionToken(customer.id, 'customer');
  const context = await browser.newContext();

  try {
    await context.addCookies([{
      name: 'wahaj_customer',
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    const customerSession = await context.request.get(`${baseUrl}/api/customer/me`);
    expect(customerSession.status()).toBe(200);
    expect(customerSession.headers()['cache-control']).toContain('no-store');

    const logout = await context.request.post(`${baseUrl}/api/customer/auth`, {
      headers: { origin: baseUrl },
      data: { action: 'logout' },
    });
    expect(logout.status()).toBe(200);
    expect(logout.headers()['cache-control']).toContain('no-store');

    // Simulate a copied cookie that an attacker retained before logout.
    await context.addCookies([{
      name: 'wahaj_customer',
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    expect((await context.request.get(`${baseUrl}/api/customer/me`)).status()).toBe(401);
  } finally {
    await context.close();
    await prisma.customer.delete({ where: { id: customer.id } });
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
