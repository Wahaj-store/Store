import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShopSearchParams, shopHref } from '../../lib/shop-query';

test('parses and normalizes valid search and filter parameters', () => {
  const state = parseShopSearchParams({
    q: ['  سوار ذهبي  ', 'ignored'],
    category: 'bracelets',
    minPrice: '150',
    maxPrice: '900',
    stock: 'in-stock',
    sort: 'price-asc',
    page: '3',
  });

  assert.equal(state.q, 'سوار ذهبي');
  assert.equal(state.filters.q, 'سوار ذهبي');
  assert.equal(state.category, 'bracelets');
  assert.equal(state.minPrice, 150);
  assert.equal(state.maxPrice, 900);
  assert.equal(state.invalidPriceRange, false);
  assert.equal(state.inStock, true);
  assert.equal(state.sort, 'price-asc');
  assert.equal(state.page, 3);
});

test('rejects a reversed price range instead of applying an impossible filter', () => {
  const state = parseShopSearchParams({ minPrice: '900', maxPrice: '150' });

  assert.equal(state.invalidPriceRange, true);
  assert.equal(state.minPrice, 900);
  assert.equal(state.maxPrice, 150);
  assert.equal(state.filters.minPrice, null);
  assert.equal(state.filters.maxPrice, null);
});

test('sanitizes invalid values and bounds pagination', () => {
  const state = parseShopSearchParams({
    minPrice: '-1',
    maxPrice: 'not-a-number',
    sort: 'unknown',
    page: '999999999',
    q: 'x'.repeat(140),
  });

  assert.equal(state.minPrice, null);
  assert.equal(state.maxPrice, null);
  assert.equal(state.sort, 'newest');
  assert.equal(state.page, 100_000);
  assert.equal(state.q.length, 120);
});

test('filter links preserve unrelated filters and reset pagination', () => {
  const state = parseShopSearchParams({
    q: 'سوار',
    category: 'rings',
    minPrice: '100',
    stock: 'in-stock',
    page: '4',
  });
  const url = new URL(shopHref(state, { category: 'bracelets' }), 'https://example.test');

  assert.equal(url.pathname, '/shop');
  assert.equal(url.searchParams.get('q'), 'سوار');
  assert.equal(url.searchParams.get('category'), 'bracelets');
  assert.equal(url.searchParams.get('minPrice'), '100');
  assert.equal(url.searchParams.get('stock'), 'in-stock');
  assert.equal(url.searchParams.has('page'), false);
});
