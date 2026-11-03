import assert from 'node:assert/strict';
import test from 'node:test';
import { getGalleryKeyboardTarget } from '../../lib/gallery-navigation';

test('thumbnail arrow keys follow visual order in RTL and LTR layouts', () => {
  assert.equal(getGalleryKeyboardTarget(0, 'ArrowLeft', 4, 'rtl'), 1);
  assert.equal(getGalleryKeyboardTarget(1, 'ArrowRight', 4, 'rtl'), 0);
  assert.equal(getGalleryKeyboardTarget(0, 'ArrowRight', 4, 'ltr'), 1);
  assert.equal(getGalleryKeyboardTarget(1, 'ArrowLeft', 4, 'ltr'), 0);
});

test('thumbnail navigation wraps and supports Home and End', () => {
  assert.equal(getGalleryKeyboardTarget(3, 'ArrowLeft', 4, 'rtl'), 0);
  assert.equal(getGalleryKeyboardTarget(0, 'ArrowRight', 4, 'rtl'), 3);
  assert.equal(getGalleryKeyboardTarget(2, 'Home', 4), 0);
  assert.equal(getGalleryKeyboardTarget(1, 'End', 4), 3);
});

test('unsupported keys and invalid gallery sizes do not change selection', () => {
  assert.equal(getGalleryKeyboardTarget(0, 'Enter', 3), null);
  assert.equal(getGalleryKeyboardTarget(0, 'ArrowLeft', 0), null);
  assert.equal(getGalleryKeyboardTarget(-1, 'End', 3), null);
});
