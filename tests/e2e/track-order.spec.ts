import { expect, test } from '@playwright/test';

test.describe('Track order', () => {
  test('shows the protected tracking form and handles a not-found response', async ({ page }) => {
    await page.route('**/api/track-order', async (route) => {
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body).toEqual({ orderNumber: 'WAH-TEST-001', phone: '01012345678' });

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: 'عذراً، لم يتم العثور على طلب بهذه البيانات. تأكد من البيانات واطلب المساعدة.' }),
      });
    });

    await page.goto('/track-order');
    await expect(page.getByRole('heading', { name: 'تابع خط سير طلبك' })).toBeVisible();

    await page.getByLabel('رقم الطلب').fill('WAH-TEST-001');
    await page.getByLabel('رقم الهاتف المسجل').fill('01012345678');
    await page.getByRole('button', { name: 'بحث وتتبع الطلب' }).click();

    await expect(page.getByText('عذراً، لم يتم العثور على طلب بهذه البيانات. تأكد من البيانات واطلب المساعدة.')).toBeVisible();
  });

  test('renders shipment and return information returned by the tracking API', async ({ page }) => {
    await page.route('**/api/track-order', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          number: 'WAH-TEST-002',
          status: 'SHIPPED',
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          total: 850,
          shippingProvider: 'Wahaj Express',
          trackingNumber: 'WX-123456',
          shippingGovernorate: 'الشرقية',
          shippingCity: 'الزقازيق',
          shippingAddress: 'عنوان الاختبار',
          timeline: [],
          items: [],
          shipments: [
            {
              status: 'IN_TRANSIT',
              provider: 'Wahaj Express',
              trackingNumber: 'WX-123456',
              shippedAt: '2026-10-01T09:00:00.000Z',
            },
          ],
          returnRequests: [
            {
              number: 'RET-TEST-001',
              status: 'REQUESTED',
              reason: 'DAMAGED',
              createdAt: '2026-10-01T10:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.goto('/track-order');
    await page.getByLabel('رقم الطلب').fill('WAH-TEST-002');
    await page.getByLabel('رقم الهاتف المسجل').fill('01012345678');
    await page.getByRole('button', { name: 'بحث وتتبع الطلب' }).click();

    await expect(page.getByText('WX-123456')).toBeVisible();
    await expect(page.getByText('Wahaj Express')).toBeVisible();
  });
});
