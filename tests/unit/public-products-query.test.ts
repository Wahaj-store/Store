import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicProductsOrder,
  buildPublicProductsWhere,
  parsePublicProductsQuery,
  PUBLIC_PRODUCT_LIST_SELECT,
  PUBLIC_PRODUCTS_MAX_PAGE,
} from '../../lib/public-products-query';

test('public product query normalizes Arabic search and builds one indexed-field predicate', () => {
  const query = parsePublicProductsQuery(new URLSearchParams('q=%D8%A3%D9%8E%D8%B3%D9%88%D8%A7%D8%B1'));
  const where = buildPublicProductsWhere(query);

  assert.equal(query.query, 'اسوار');
  assert.deepEqual(where, {
    status: 'PUBLISHED',
    searchText: { contains: 'اسوار' },
  });
});

test('public product query bounds pagination and sanitizes filters', () => {
  const query = parsePublicProductsQuery(new URLSearchParams(
    'page=999999999&category=bracelets&minPrice=50&maxPrice=700&stock=in-stock&sort=price-asc',
  ));

  assert.equal(query.page, PUBLIC_PRODUCTS_MAX_PAGE);
  assert.equal(query.category, 'bracelets');
  assert.equal(query.minPrice, 50);
  assert.equal(query.maxPrice, 700);
  assert.equal(query.inStock, true);
  assert.deepEqual(buildPublicProductsWhere(query), {
    status: 'PUBLISHED',
    category: { is: { slug: 'bracelets' } },
    price: { gte: 50, lte: 700 },
    OR: [
      { stock: { gt: 0 } },
      { variants: { some: { stock: { gt: 0 } } } },
    ],
  });
  assert.deepEqual(buildPublicProductsOrder(query.sort), [
    { price: 'asc' },
    { id: 'asc' },
  ]);
});

test('public product list selects card data and bounds related rows', () => {
  assert.equal('searchText' in PUBLIC_PRODUCT_LIST_SELECT, false);
  assert.deepEqual(PUBLIC_PRODUCT_LIST_SELECT.images, {
    select: { url: true, alt: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  });
  assert.deepEqual(PUBLIC_PRODUCT_LIST_SELECT.category, { select: { name: true } });
  assert.deepEqual(PUBLIC_PRODUCT_LIST_SELECT.variants, {
    select: { id: true, stock: true },
    orderBy: { stock: 'desc' },
    take: 1,
  });
});

test('unknown sort and invalid page values fall back safely', () => {
  const query = parsePublicProductsQuery(new URLSearchParams('page=-5&sort=untrusted'));

  assert.equal(query.page, 1);
  assert.equal(query.sort, 'newest');
  assert.deepEqual(buildPublicProductsOrder(query.sort), [
    { createdAt: 'desc' },
    { id: 'desc' },
  ]);
});
