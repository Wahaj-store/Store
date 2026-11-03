import { expect, test } from './fixtures';

test('cart drawer closes on Escape and restores focus to its trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/faq');

  const trigger = page.getByRole('button', { name: /فتح السلة الجانبية/ });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'سلة مشترياتكِ' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'إغلاق السلة' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('mobile quick navigation exposes the primary destinations and tracks the active route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/faq');

  const nav = page.getByRole('navigation', { name: 'التنقل السريع' });
  const destinations = [
    ['الرئيسية', '/'],
    ['المتجر', '/shop'],
    ['السلة', '/cart'],
    ['حسابي', '/account'],
  ] as const;

  for (const [label, href] of destinations) {
    const link = nav.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toBeVisible();
  }

  await nav.getByRole('link', { name: 'السلة', exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(nav.getByRole('link', { name: 'السلة', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('mobile navigation drawer closes after following a store link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/faq');

  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  const dialog = page.getByRole('dialog', { name: 'قائمة التنقل الرئيسية' });
  await expect(dialog).toBeVisible();

  const aboutLink = dialog.getByRole('navigation', { name: 'روابط المتجر' })
    .getByRole('link', { name: 'من نحن', exact: true });
  await aboutLink.click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(dialog).toHaveCount(0);
});
