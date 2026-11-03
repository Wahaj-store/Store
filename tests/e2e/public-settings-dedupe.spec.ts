import { expect, test } from './fixtures';

test('storefront chrome and footer share one public settings request', async ({ page }) => {
  let settingsRequests = 0;

  await page.route('**/api/settings', async (route) => {
    settingsRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        settings: { store_name: 'وهج' },
        payments: [],
        theme: null,
      }),
    });
  });

  await page.goto('/');
  await expect.poll(() => settingsRequests).toBe(1);
  await page.waitForTimeout(100);
  expect(settingsRequests).toBe(1);
});
