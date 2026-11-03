import { expect, test } from './fixtures';

test('shop search is visible, keeps active filters, and resets pagination', async ({ page }) => {
  await page.goto('/shop?category=bracelets&minPrice=100&stock=in-stock&sort=price-asc&page=3');

  const search = page.getByRole('search', { name: 'البحث في منتجات وَهَج' });
  const input = search.getByRole('searchbox', { name: 'ابحثي عن قطعة أو اسم منتج' });
  await expect(search).toBeVisible();
  await input.fill('سوار ذهبي');
  await search.getByRole('button', { name: 'ابحثي' }).click();
  await page.waitForURL((url) => url.searchParams.get('q') === 'سوار ذهبي');

  const params = new URL(page.url()).searchParams;
  expect(params.get('category')).toBe('bracelets');
  expect(params.get('minPrice')).toBe('100');
  expect(params.get('stock')).toBe('in-stock');
  expect(params.get('sort')).toBe('price-asc');
  expect(params.has('page')).toBe(false);
  await expect(page.getByRole('searchbox', { name: 'ابحثي عن قطعة أو اسم منتج' })).toHaveValue('سوار ذهبي');
});
