import { expect, test } from '@playwright/test';

test('contact form submits successfully', async ({ page }) => {
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ settings: {} }),
    });
  });

  await page.route('**/api/contact', async (route) => {
    expect(route.request().method()).toBe('POST');
    const body = route.request().postDataJSON();
    expect(body.name).toBe('عميل اختبار');
    expect(body.phone).toBe('01012345678');
    expect(body.message).toBe('رسالة اختبار من Playwright');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/contact');
  await page.getByLabel('الاسم بالكامل').fill('عميل اختبار');
  await page.getByLabel('رقم الهاتف').fill('01012345678');
  await page.getByLabel('النص أو الاستفسار').fill('رسالة اختبار من Playwright');
  await page.getByRole('button', { name: 'إرسال الرسالة' }).click();

  await expect(page.getByText('تم إرسال رسالتك بنجاح!')).toBeVisible();
});
