import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeProductIntoCart } from '../../lib/cart-storage';

const product = {
  id: 'p-1',
  name: 'عقد ذهبي',
  price: 1200,
  stock: 20,
  images: [{ url: '/images/necklace.jpg' }],
  variants: [
    { id: 'size-40', name: 'الطول', value: '40 سم', price: 1250, stock: 4 },
    { id: 'size-45', name: 'الطول', value: '45 سم', price: 1350, stock: 2 },
    { id: 'size-sold-out', name: 'الطول', value: '50 سم', price: 1450, stock: 0 },
  ],
};

test('adds the selected variant using its price, label, image and bounded quantity', () => {
  const cart = mergeProductIntoCart([], product, 'size-40', 9);

  assert.ok(cart);
  assert.equal(cart.length, 1);
  assert.deepEqual(cart[0], {
    productId: 'p-1',
    variantId: 'size-40',
    variantName: 'الطول',
    variantValue: '40 سم',
    name: 'عقد ذهبي',
    price: 1250,
    image: '/images/necklace.jpg',
    quantity: 4,
    maxStock: 4,
  });
});

test('merges the same variant without combining a different variant', () => {
  const initial = [
    { productId: 'p-1', variantId: 'size-40', name: 'عقد ذهبي', price: 1250, image: '', quantity: 2, maxStock: 8 },
    { productId: 'p-1', variantId: 'size-45', name: 'عقد ذهبي', price: 1350, image: '', quantity: 1, maxStock: 2 },
  ];
  const cart = mergeProductIntoCart(initial, product, 'size-40', 3);

  assert.ok(cart);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 4);
  assert.equal(cart[1].quantity, 1);
  assert.equal(initial[0].quantity, 2, 'the original cart is not mutated');
});

test('refuses missing, unknown, sold-out and malformed choices', () => {
  assert.equal(mergeProductIntoCart([], product), null);
  assert.equal(mergeProductIntoCart([], product, 'missing'), null);
  assert.equal(mergeProductIntoCart([], product, 'size-sold-out'), null);
  assert.equal(mergeProductIntoCart([], { ...product, variants: [], stock: 0 }), null);
  assert.equal(mergeProductIntoCart([], { ...product, price: Number.NaN, variants: [] }), null);
});

test('adds a product without variants and defaults invalid quantities to one', () => {
  const simpleProduct = { ...product, variants: [], stock: 6 };
  const cart = mergeProductIntoCart(null, simpleProduct, undefined, Number.NaN);

  assert.ok(cart);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 1);
  assert.equal(cart[0].maxStock, 6);
});
