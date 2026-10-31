import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ settings: {}, payments: [], theme: null }) });
  });
  await page.route('**/api/features', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: {} }) });
  });
});

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
  await expect(page.getByRole('heading', { name: 'إجابات واضحة لأسئلتك' })).toBeVisible();
  await expect(page.getByText('كيف يمكنني تتبع طلبي؟')).toBeVisible();

  const categoryGroup = page.getByRole('group', { name: 'تصنيفات الأسئلة' });
  const allCategory = categoryGroup.getByRole('button', { name: 'كل الأسئلة' });
  const shippingCategory = categoryGroup.getByRole('button', { name: 'الشحن والتوصيل' });
  await expect(allCategory).toHaveAttribute('aria-pressed', 'true');
  await shippingCategory.click();
  await expect(shippingCategory).toHaveAttribute('aria-pressed', 'true');
  await expect(allCategory).toHaveAttribute('aria-pressed', 'false');

  const answer = page.getByText('استخدم صفحة تتبع الطلب وأدخل رقم الطلب ورقم الهاتف المسجل.');
  const question = page.getByRole('button', { name: /كيف يمكنني تتبع طلبي؟/ });
  await expect(question).toHaveAttribute('aria-controls', /^wahaj-faq-answer-/);
  await expect(answer).toBeVisible();
  await question.click();
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
});
