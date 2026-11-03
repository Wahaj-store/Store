import { SignJWT } from 'jose';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const TEST_AUTH_SECRET = 'ci-only-auth-secret-do-not-use-outside-tests';
const emptyAnalytics = {
  totals: {},
  comparison: {},
  daily: [],
  payments: [],
  topProducts: [],
  statuses: [],
  segments: {},
};

type Reply = { status?: number; body: unknown };
type AdminReply = (path: string) => Reply;

async function installAdminMocks(page: Page, replyForPath: AdminReply) {
  const secret = process.env.AUTH_SECRET || TEST_AUTH_SECRET;
  const token = await new SignJWT({ typ: 'admin-session', role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('admin')
    .setSubject('admin-e2e-user')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));

  await page.context().addCookies([{
    name: 'wahaj_session',
    value: token,
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }]);

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: { id: 'admin-e2e-user', name: 'مدير الاختبار', email: 'admin@example.test', role: 'ADMIN' },
      }),
    });
  });

  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = replyForPath(path);
    await route.fulfill({
      status: reply.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(reply.body),
    });
  });
}

function operationalReply(path: string): Reply {
  if (path === '/api/admin/shipments') return { body: { pendingOrders: [], shipments: [] } };
  if (path === '/api/admin/returns') return { body: [] };
  if (path === '/api/admin/analytics') return { body: emptyAnalytics };
  if (path === '/api/admin/faq') return { body: [] };
  return { body: [] };
}

test('admin data failure is announced and retry recovers without presenting an empty state', async ({ page }) => {
  let analyticsRequests = 0;
  let allowAnalyticsRecovery = false;
  await installAdminMocks(page, (path) => {
    if (path === '/api/admin/analytics') {
      analyticsRequests += 1;
      if (!allowAnalyticsRecovery) {
        return { status: 503, body: { error: 'تعذر تحميل بيانات التحليلات. حاولي إعادة المحاولة.' } };
      }
    }
    return operationalReply(path);
  });

  await page.goto('/admin?tab=analytics');
  const loadError = page.getByRole('alert').filter({ hasText: 'تعذر تحميل بيانات التحليلات.' });
  await expect(loadError).toBeVisible();
  await expect(page.getByText('لا توجد بيانات كافية.')).toHaveCount(0);

  allowAnalyticsRecovery = true;
  await loadError.getByRole('button', { name: 'إعادة المحاولة' }).click();
  await expect(loadError).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'التحليلات المتقدمة' })).toBeVisible();
  await expect(page.getByText('لا توجد بيانات كافية.')).toBeVisible();
  expect(analyticsRequests).toBeGreaterThan(1);
});

test('admin presents a genuine empty FAQ collection as empty only after a successful response', async ({ page }) => {
  await installAdminMocks(page, operationalReply);

  await page.goto('/admin?tab=faq');
  await expect(page.getByText('لا توجد أسئلة شائعة مضافة حتى الآن.')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /تعذر|فشل|خطأ/ })).toHaveCount(0);
});


test('admin quick search traps focus, closes on Escape, and restores its trigger', async ({ page }) => {
  await installAdminMocks(page, operationalReply);
  await page.goto('/admin?tab=analytics');

  const trigger = page.getByRole('button', { name: 'فتح البحث السريع' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'البحث السريع في لوحة الإدارة' });
  const input = dialog.getByRole('textbox', { name: 'ابحث عن قسم أو أداة' });
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(input).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
