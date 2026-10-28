type InvoiceGiftWrapOrder = {
  giftWrapSelected?: unknown;
  giftWrapFee?: unknown;
  notes?: string | null;
  total?: unknown;
};

function extractLegacyGiftWrap(notes: string | null | undefined) {
  const pattern = /(?:^|\r?\n)خدمة تغليف هدايا:\s*([\d٠-٩۰-۹٬,٫.]+)\s*ج\.م(?=\r?\n|$)/;
  const match = (notes || '').match(pattern);
  if (!match) return { selected: false, amount: 0, customerNotes: notes || '' };

  const normalizedAmount = match[1]
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٬,]/g, '')
    .replace(/٫/g, '.');
  const parsedAmount = Number(normalizedAmount);

  return {
    selected: true,
    amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0,
    customerNotes: (notes || '').replace(match[0], '').trim(),
  };
}

export function buildInvoiceGiftWrapView(order: InvoiceGiftWrapOrder, showGiftWrapLine = false) {
  const legacy = extractLegacyGiftWrap(order.notes);
  const parsedFee = Number(order.giftWrapFee ?? 0);
  const persistedFee = Number.isFinite(parsedFee) ? Math.max(0, parsedFee) : 0;
  const persistedSelected = order.giftWrapSelected === true;
  const hasPersistedGiftWrap = persistedSelected || persistedFee > 0;
  const selected = hasPersistedGiftWrap
    ? persistedSelected || persistedFee > 0
    : legacy.selected;
  const amount = hasPersistedGiftWrap ? persistedFee : legacy.amount;
  const parsedTotal = Number(order.total ?? 0);

  return {
    selected,
    amount,
    customerNotes: legacy.customerNotes,
    lineVisible: selected && showGiftWrapLine,
    grandTotal: Number.isFinite(parsedTotal) ? parsedTotal : 0,
  };
}

export const invoiceGiftWrapToggleScript = `
(function () {
  var toggle = document.getElementById('gift-wrap-note-toggle');
  var paidRow = document.getElementById('gift-wrap-paid-row');
  var previewStatus = document.getElementById('gift-wrap-preview-status');
  if (!toggle) return;
  toggle.addEventListener('change', function () {
    if (paidRow) paidRow.hidden = !toggle.checked;
    if (previewStatus) {
      previewStatus.textContent = toggle.checked
        ? 'بند رسوم التغليف ظاهر في المعاينة، والرسم داخل الإجمالي النهائي.'
        : 'بند رسوم التغليف مخفي من المعاينة، والرسم داخل الإجمالي النهائي.';
    }
  });
})();
`;
