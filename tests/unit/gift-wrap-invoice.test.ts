import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import {
  addGiftWrapFeeToTotal,
  resolveGiftWrapSelection,
  toGiftWrapOrderFields,
} from '../../lib/gift-wrap';
import { buildInvoiceGiftWrapView, invoiceGiftWrapToggleScript } from '../../lib/invoice-gift-wrap';

test('gift wrap is selected and charged only when requested and enabled', () => {
  const selected = resolveGiftWrapSelection(true, true, '35.50');
  assert.deepEqual(selected, { selected: true, fee: 35.5 });
  assert.deepEqual(toGiftWrapOrderFields(selected), {
    giftWrapSelected: true,
    giftWrapFee: 35.5,
  });
  assert.equal(addGiftWrapFeeToTotal(200, selected), 235.5);
});

test('disabled or unrequested gift wrap persists safe zero values and does not affect total', () => {
  const cases = [
    resolveGiftWrapSelection(true, false, '40'),
    resolveGiftWrapSelection(false, true, '40'),
  ];

  for (const selection of cases) {
    assert.deepEqual(selection, { selected: false, fee: 0 });
    assert.deepEqual(toGiftWrapOrderFields(selection), {
      giftWrapSelected: false,
      giftWrapFee: 0,
    });
    assert.equal(addGiftWrapFeeToTotal(200, selection), 200);
  }
});

test('gift wrap fee is safely bounded and invalid configuration cannot add a charge', () => {
  assert.deepEqual(resolveGiftWrapSelection(true, true, '-15'), { selected: true, fee: 0 });
  assert.deepEqual(resolveGiftWrapSelection(true, true, 'not-a-number'), { selected: true, fee: 0 });
  assert.deepEqual(resolveGiftWrapSelection(true, true, '200000'), { selected: true, fee: 100_000 });
});

test('invoice prefers persisted gift wrap fields over the legacy note marker', () => {
  const view = buildInvoiceGiftWrapView({
    giftWrapSelected: true,
    giftWrapFee: '35.50',
    notes: 'اتصلي قبل التوصيل\nخدمة تغليف هدايا: 10 ج.م',
    total: '235.50',
  });

  assert.deepEqual(view, {
    selected: true,
    amount: 35.5,
    customerNotes: 'اتصلي قبل التوصيل',
    lineVisible: false,
    grandTotal: 235.5,
  });
});

test('invoice supports legacy orders by parsing Arabic digits and preserving customer notes', () => {
  const view = buildInvoiceGiftWrapView({
    giftWrapSelected: false,
    giftWrapFee: 0,
    notes: 'يرجى الاتصال\nخدمة تغليف هدايا: ١٬٢٥٠٫٥ ج.م',
    total: 1500,
  });

  assert.equal(view.selected, true);
  assert.equal(view.amount, 1250.5);
  assert.equal(view.customerNotes, 'يرجى الاتصال');
  assert.equal(view.lineVisible, false);
  assert.equal(view.grandTotal, 1500);
});

test('invoice line visibility toggles without changing the stored grand total', () => {
  const order = { giftWrapSelected: true, giftWrapFee: 20, notes: null, total: 220 };
  const hidden = buildInvoiceGiftWrapView(order, false);
  const shown = buildInvoiceGiftWrapView(order, true);

  assert.equal(hidden.lineVisible, false);
  assert.equal(shown.lineVisible, true);
  assert.equal(hidden.amount, 20);
  assert.equal(shown.amount, 20);
  assert.equal(hidden.grandTotal, 220);
  assert.equal(shown.grandTotal, 220);
});

test('invoice preview control actually hides and shows its row and announces the state', () => {
  let changeHandler: (() => void) | undefined;
  const toggle = {
    checked: false,
    addEventListener: (_event: string, handler: () => void) => { changeHandler = handler; },
  };
  const paidRow = { hidden: true };
  const previewStatus = { textContent: '' };
  const elements: Record<string, unknown> = {
    'gift-wrap-note-toggle': toggle,
    'gift-wrap-paid-row': paidRow,
    'gift-wrap-preview-status': previewStatus,
  };

  runInNewContext(invoiceGiftWrapToggleScript, {
    document: { getElementById: (id: string) => elements[id] ?? null },
  });

  toggle.checked = true;
  changeHandler?.();
  assert.equal(paidRow.hidden, false);
  assert.match(previewStatus.textContent, /ظاهر في المعاينة/);
  assert.match(previewStatus.textContent, /داخل الإجمالي النهائي/);

  toggle.checked = false;
  changeHandler?.();
  assert.equal(paidRow.hidden, true);
  assert.match(previewStatus.textContent, /مخفي من المعاينة/);
  assert.match(previewStatus.textContent, /داخل الإجمالي النهائي/);
});

test('invoice leaves a normal order without gift wrap and retains its customer notes', () => {
  const view = buildInvoiceGiftWrapView({
    giftWrapSelected: false,
    giftWrapFee: 0,
    notes: 'اتصلي بعد الساعة الخامسة',
    total: 100,
  }, true);

  assert.equal(view.selected, false);
  assert.equal(view.amount, 0);
  assert.equal(view.lineVisible, false);
  assert.equal(view.customerNotes, 'اتصلي بعد الساعة الخامسة');
  assert.equal(view.grandTotal, 100);
});
