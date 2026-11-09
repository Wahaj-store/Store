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
  const cityField = page.getByLabel('المدينة / المركز');
  if (await cityField.evaluate(element => element.tagName === 'SELECT')) {
    await cityField.selectOption('القاهرة');
  } else {
    await cityField.fill('القاهرة');
  }
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
  const progress = page.locator('.wahaj-checkout-progress');
  await expect(progress.getByText('رحلة الطلب')).toHaveCount(0);
  await expect(progress.getByText('خطوات واضحة وتجربة شراء آمنة')).toHaveCount(0);
  await expect(progress.locator('.wahaj-checkout-progress__status')).toHaveCSS('justify-self', 'center');
  await expect(progress.locator('.wahaj-checkout-progress__steps')).toHaveCSS('justify-self', 'center');
  await expect(page.locator('.wahaj-checkout-progress__status')).toContainText('الخطوة 2 من 3');
  await page.getByRole('button', { name: /مراجعة الطلب/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillCheckoutDetails(page);
  await expect(page.locator('.wahaj-checkout-progress__status')).toContainText('الخطوة 3 من 3');
  await expect(page.locator('.wahaj-checkout-progress [aria-current="step"]')).toContainText('مراجعة الطلب');
  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeEnabled();
  await expect(submitButton.locator('.wahaj-checkout-submit__amount')).toHaveCSS('display', 'none');
  await submitButton.click();

  await expect.poll(() => checkoutRequestBody).toContain('"expectedTotal":155');
  await expect(page).toHaveURL(/\/checkout\/success\?order=WAH-E2E-001/);
});

test('required shipping fields explain what is missing and focus the first invalid field', async ({ page }) => {
  let checkoutRequests = 0;
  await page.route('**/api/checkout', async (route) => {
    checkoutRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orderNumber: 'SHOULD-NOT-EXIST' }) });
  });

  await prepareCheckout(page);
  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page.getByRole('alert').filter({ hasText: 'الاسم بالكامل' })).toBeVisible();
  await expect(page.locator('#checkout-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#checkout-name-error')).toBeVisible();
  await expect(page.locator('#checkout-phone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#checkout-governorate')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#checkout-city')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#checkout-address')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#checkout-name')).toBeFocused();
  expect(checkoutRequests).toBe(0);
});

test('city-specific shipping zones require a listed city before price preview', async ({ page }) => {
  let previewRequests = 0;
  await page.route('**/api/checkout/preview', async (route) => {
    previewRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(previewFixture) });
  });

  await prepareCheckout(page);
  await page.getByLabel('الاسم بالكامل').fill('عميل اختبار');
  await page.getByLabel('رقم الهاتف').fill('01012345678');
  await page.getByLabel('المحافظة').selectOption('القاهرة');
  const cityField = page.getByLabel('المدينة / المركز');
  await expect(cityField).toHaveJSProperty('tagName', 'SELECT');
  await page.getByLabel('العنوان بالتفصيل').fill('شارع الاختبار، مبنى 1');

  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.locator('#checkout-city-error')).toContainText('اختاري المدينة');
  expect(previewRequests).toBe(0);
});

test('mobile cart keeps the shipping step reachable across narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((cart) => {
    window.localStorage.setItem('wahaj_cart', JSON.stringify(cart));
  }, cartFixture);
  await page.route('**/api/cart/abandoned', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ settings: { free_shipping: 500 }, payments: [], features: {} }),
    });
  });

  await page.goto('/cart');
  const cta = page.locator('.wahaj-cart-summary__cta');
  const progress = page.locator('.wahaj-checkout-progress');
  await expect(page.getByRole('heading', { name: 'سلة المشتريات' })).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(progress.getByText('رحلة الطلب')).toHaveCount(0);
  await expect(progress.getByText('خطوات واضحة وتجربة شراء آمنة')).toHaveCount(0);
  await expect(progress.locator('[aria-current="step"]')).toContainText('سلة المشتريات');
  await expect(progress.getByRole('link', { name: /التوصيل والدفع/ })).toHaveAttribute('href', '/checkout');
  await expect(cta).toHaveCSS('position', 'fixed');
  await expect(cta).toBeVisible();
  await expect(page.locator('.wahaj-mobile-bottom-nav')).toBeHidden();
  await expect(page.getByText(/ستظهر تكلفة الشحن بعد اختيار المحافظة/)).toBeVisible();

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const progressBox = await progress.boundingBox();
    expect(progressBox).not.toBeNull();
    expect(progressBox!.x).toBeGreaterThanOrEqual(0);
    expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(width + 1);
    expect(await progress.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  }
});

test('mobile checkout keeps the final total and confirmation reachable across narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        settings: {},
        features: {},
        payments: [{ method: 'COD', label: 'الدفع عند الاستلام', enabled: true }],
      }),
    });
  });
  await page.route('**/api/checkout/preview', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(previewFixture) });
  });

  let checkoutRequestBody = '';
  await page.route('**/api/checkout', async (route) => {
    checkoutRequestBody = route.request().postDataBuffer()?.toString('utf8') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orderNumber: 'WAH-E2E-MOBILE' }),
    });
  });

  await prepareCheckout(page);
  await fillCheckoutDetails(page);
  const submitButton = page.locator('.wahaj-checkout-submit');
  await expect(submitButton).toHaveCSS('position', 'fixed');
  await expect(submitButton).toBeVisible();
  await expect(submitButton.locator('.wahaj-checkout-submit__amount')).toContainText('١٥٥');
  await expect(page.locator('.wahaj-mobile-bottom-nav')).toBeHidden();
  const progress = page.locator('.wahaj-checkout-progress');
  await expect(progress).toBeVisible();
  await expect(submitButton).toBeEnabled();

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const progressBox = await progress.boundingBox();
    expect(progressBox).not.toBeNull();
    expect(progressBox!.x).toBeGreaterThanOrEqual(0);
    expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(width + 1);
    expect(await progress.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const box = await submitButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  }

  await submitButton.click();
  await expect.poll(() => checkoutRequestBody).toContain('"expectedTotal":155');
  await expect(page).toHaveURL(/\/checkout\/success\?order=WAH-E2E-MOBILE/);
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
  await fillCheckoutDetails(page);
  const previewError = page.getByRole('alert').filter({ hasText: 'تعذر تحديث الأسعار حاليًا' });
  await expect(previewError).toBeVisible();
  const submitButton = page.getByRole('button', { name: 'تأكيد وإتمام الطلب' });
  await expect(submitButton).toBeDisabled();

  previewAvailable = true;
  await previewError.getByRole('button', { name: 'إعادة المحاولة' }).click();
  await expect(submitButton).toBeEnabled();
  await expect(previewError).toHaveCount(0);
});
