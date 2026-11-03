import { expect, test } from './fixtures';

const mobileWidths = [320, 360, 390, 480];

test('mobile header and cart quantity controls provide usable touch targets without clipping', async ({ page }) => {
  await page.route('**/api/features', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ features: { cart_drawer: true, dark_mode: true } }),
    });
  });

  await page.setViewportSize({ width: mobileWidths[0], height: 844 });
  await page.goto('/about');

  await page.evaluate(() => {
    localStorage.setItem('wahaj_cart', JSON.stringify([{
      productId: 'touch-target-product',
      variantId: null,
      name: 'سوار تجريبي',
      price: 120,
      image: '',
      quantity: 2,
      maxStock: 8,
    }]));
    window.dispatchEvent(new Event('wahaj-cart-change'));
  });
  await expect(page.getByRole('button', { name: 'فتح السلة الجانبية (2)' })).toBeVisible();

  for (const width of mobileWidths) {
    await page.setViewportSize({ width, height: 844 });
    const visibleTargets = page.locator('.wahaj-header--luxury .wahaj-header__menu:visible, .wahaj-header--luxury .wahaj-header__action:visible');
    await expect(visibleTargets.first()).toBeVisible();

    const layout = await page.evaluate(() => {
      const inner = document.querySelector('.wahaj-header__inner');
      const firstGroup = inner?.firstElementChild;
      const actions = document.querySelector('.wahaj-header__actions');
      const targets = Array.from(document.querySelectorAll<HTMLElement>(
        '.wahaj-header--luxury .wahaj-header__menu, .wahaj-header--luxury .wahaj-header__action',
      )).filter((element) => element.getClientRects().length > 0);
      const boxes = targets.map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const innerRect = inner?.getBoundingClientRect();
      const groupRect = firstGroup?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        headerRight: innerRect ? innerRect.right : 0,
        headerLeft: innerRect ? innerRect.left : 0,
        groupsOverlap: Boolean(groupRect && actionsRect && Math.max(groupRect.left, actionsRect.left) < Math.min(groupRect.right, actionsRect.right)),
        targets: boxes,
      };
    });

    expect(layout.targets.length).toBeGreaterThan(0);
    for (const target of layout.targets) {
      expect(target.width, `touch target width at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(target.height, `touch target height at ${width}px`).toBeGreaterThanOrEqual(44);
    }
    expect(layout.headerLeft, `header left edge at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(layout.headerRight, `header right edge at ${width}px`).toBeLessThanOrEqual(width);
    expect(layout.groupsOverlap, `header groups overlap at ${width}px`).toBe(false);
  }

  await page.getByRole('button', { name: 'فتح السلة الجانبية (2)' }).click();
  const dialog = page.getByRole('dialog', { name: 'سلة مشترياتكِ' });
  await expect(dialog).toBeVisible();

  for (const label of ['تقليل كمية سوار تجريبي', 'زيادة كمية سوار تجريبي']) {
    const control = dialog.getByRole('button', { name: label });
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
