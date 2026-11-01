import { expect, test as base } from '@playwright/test';

/**
 * Shared public API mocks keep storefront E2E tests independent of PostgreSQL.
 * Individual specs can register more-specific routes for the API under test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ settings: {}, payments: [], theme: null, features: {} }),
      });
    });

    await page.route('**/api/features', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ features: {} }),
      });
    });

    await use(page);
  },
});

export { expect };
