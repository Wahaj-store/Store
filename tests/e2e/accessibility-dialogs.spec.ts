import { expect, test } from './fixtures';

const publicFaqFixture = [
  {
    id: 'faq-keyboard-1',
    question: 'كيف يمكنني تتبع طلبي؟',
    answer: 'استخدمي صفحة تتبع الطلب.',
    category: 'shipping',
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/faq', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publicFaqFixture) });
  });
});

test('search dialog traps focus, closes on Escape, and restores its trigger', async ({ page }) => {
  await page.goto('/faq');

  const trigger = page.getByRole('button', { name: 'المتجر والبحث عن المنتجات' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: /ابحثي عن قطعتك/ });
  const searchInput = page.getByRole('textbox', { name: 'البحث في منتجات وَهَج' });
  await expect(dialog).toBeVisible();
  await expect(searchInput).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'إغلاق البحث' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(searchInput).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('mobile navigation dialog closes on Escape and restores its trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/faq');

  const trigger = page.getByRole('button', { name: 'فتح القائمة' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  const dialog = page.getByRole('dialog', { name: 'قائمة التنقل الرئيسية' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'إغلاق القائمة' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('account mode controls expose pressed state', async ({ page }) => {
  await page.route('**/api/customer/me', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) });
  });
  await page.goto('/account');

  const modeGroup = page.getByRole('group', { name: 'اختاري طريقة الدخول' });
  const login = modeGroup.getByRole('button', { name: 'تسجيل الدخول', exact: true });
  const register = modeGroup.getByRole('button', { name: 'إنشاء حساب', exact: true });
  await expect(login).toHaveAttribute('aria-pressed', 'true');
  await expect(register).toHaveAttribute('aria-pressed', 'false');

  await register.click();
  await expect(register).toHaveAttribute('aria-pressed', 'true');
  await expect(login).toHaveAttribute('aria-pressed', 'false');
});
