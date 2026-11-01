import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const cartFixture = [{
  productId: 'product-e2e-1',
  variantId: null,
  quantity: 1,
  name: 'خاتم وَهَج للاختبار',
  price: 120,
}];

const previewFixture = {
  subtotal: 120,
  discount: 0,
  shipping: 35,
  total: 155,
  freeShipping: false,
  appliedOffers: [],
  giftCardAmount: 0,
  giftWrapFee: 0,
};

async function prepareCheckout(page: Page) {
  await page.addInitScript((cart) => {
    window.localStorage.setItem('wahaj_cart', JSON.stringify(cart));
  }, cartFixture);

  await page.route('**/api/customer/auth', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) });
  });
  await page.route('**/api/customer/addresses', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) });
  });
  await page.route('**/api/shipping', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'zone-e2e-1', governorate: 'القاهرة', city: 'القاهرة', price: 35, active: true }]),
    });
  });

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'بيانات الشحن' })).toBeVisible();
}

async function fillCheckoutDetails(page: Page) {
  await page.getByLabel('الاسم بالكامل').fill('عميل اختبار');
  await page.getByLabel('رقم الهاتف').fill('01012345678');
  await page.getByLabel('المحافظة').selectOption('القاهرة');
  await page.getByLabel('المدينة / المركز').fill('مدينة الاختبار');
  await page.getByLabel('العنوان بالتفصيل').fill('شارع الاختبار، مبنى 1');
}

test('checkout completes with the freshly verified expected total', async ({ page }) => {
  await page.route('**/api/checkout/preview', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(previewFixture) });
  });

  let checkoutRequestBody = '';
  await page.route('**/api/checkout', async (route) => {
    expect(route.request().method()).toBe('POST');
    checkoutRequestBody = route.request().postDataBuffer()?.toString('utf8') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orderNumber: 'WAH-E2E-001' }),
    });
  });

  await prepareCheckout(page);
  await fillCheckoutDetails(page);
  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect.poll(() => checkoutRequestBody).toContain('"expectedTotal":155');
  await expect(page).toHaveURL(/\/checkout\/success\?order=WAH-E2E-001/);
});

test('checkout keeps confirmation blocked on preview failure and recovers through retry', async ({ page }) => {
  let previewAvailable = false;
  await page.route('**/api/checkout/preview', async (route) => {
    if (!previewAvailable) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'تعذر تحديث الأسعار حاليًا. يرجى المحاولة لاحقًا.' }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(previewFixture) });
  });

  await prepareCheckout(page);
  const previewError = page.getByRole('alert').filter({ hasText: 'تعذر تحديث الأسعار حاليًا' });
  await expect(previewError).toBeVisible();
  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeDisabled();

  previewAvailable = true;
  await previewError.getByRole('button', { name: 'إعادة المحاولة' }).click();
  await expect(submitButton).toBeEnabled();
  await expect(previewError).toHaveCount(0);
});
