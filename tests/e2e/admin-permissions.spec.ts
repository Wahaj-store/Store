import { PrismaClient, Role } from '@prisma/client';
import { SignJWT } from 'jose';
import { expect, test } from '@playwright/test';

const prisma = new PrismaClient();
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
const authSecret = process.env.AUTH_SECRET || 'ci-only-auth-secret-do-not-use-outside-tests';

async function createAdminToken(userId: string) {
  return new SignJWT({ typ: 'admin-session', sv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('admin')
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(authSecret));
}

test('settings APIs deny viewers and allow admins to read redirects and feature flags', async ({ browser }) => {
  const unique = Date.now();
  const viewer = await prisma.user.create({
    data: {
      email: `viewer-permissions-${unique}@example.test`,
      passwordHash: 'unused-e2e-password-hash',
      role: Role.VIEWER,
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: `admin-permissions-${unique}@example.test`,
      passwordHash: 'unused-e2e-password-hash',
      role: Role.ADMIN,
    },
  });
  const context = await browser.newContext();

  try {
    await context.addCookies([{
      name: 'wahaj_session',
      value: await createAdminToken(viewer.id),
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    const viewerRedirects = await context.request.get(`${baseUrl}/api/admin/redirects`);
    expect(viewerRedirects.status()).toBe(403);
    expect(viewerRedirects.headers()['cache-control']).toContain('no-store');
    const viewerFeatures = await context.request.get(`${baseUrl}/api/admin/features`);
    expect(viewerFeatures.status()).toBe(403);
    expect(viewerFeatures.headers()['cache-control']).toContain('no-store');

    await context.addCookies([{
      name: 'wahaj_session',
      value: await createAdminToken(admin.id),
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    const adminRedirects = await context.request.get(`${baseUrl}/api/admin/redirects`);
    expect(adminRedirects.status()).toBe(200);
    expect(adminRedirects.headers()['cache-control']).toContain('no-store');
    const adminFeatures = await context.request.get(`${baseUrl}/api/admin/features`);
    expect(adminFeatures.status()).toBe(200);
    expect(adminFeatures.headers()['cache-control']).toContain('no-store');
  } finally {
    await context.close();
    await prisma.user.deleteMany({ where: { id: { in: [viewer.id, admin.id] } } });
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
