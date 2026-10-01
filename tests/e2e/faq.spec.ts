import { expect, test } from '@playwright/test';

test('FAQ page loads and opens an answer', async ({ page }) => {
  await page.route('**/api/faq', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'faq-test-1',
          question: 'كيف يمكنني تتبع طلبي؟',
          answer: 'استخدم صفحة تتبع الطلب وأدخل رقم الطلب ورقم الهاتف المسجل.',
          category: 'shipping',
        },
      ]),
    });
  });

  await page.goto('/faq');
  await expect(page.getByRole('heading', { name: 'الأسئلة الشائعة' })).toBeVisible();
  await expect(page.getByText('كيف يمكنني تتبع طلبي؟')).toBeVisible();

  await page.getByRole('button', { name: /كيف يمكنني تتبع طلبي؟/ }).click();
  await expect(page.getByText('استخدم صفحة تتبع الطلب وأدخل رقم الطلب ورقم الهاتف المسجل.')).toBeVisible();
});
