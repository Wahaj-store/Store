import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const statusLabels: Record<string, string> = {
  NEW: 'جديد',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

const paymentLabels: Record<string, string> = {
  COD: 'الدفع عند الاستلام',
  VODAFONE_CASH: 'فودافون كاش',
  CARD: 'بطاقة بنكية',
  WALLET: 'محفظة إلكترونية',
  BANK_TRANSFER: 'تحويل بنكي',
  INSTAPAY: 'إنستاباي',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'بانتظار الدفع',
  PAID: 'مدفوع',
  CONFIRMED: 'مدفوع',
  FAILED: 'فشل الدفع',
  REFUNDED: 'تم رد المبلغ',
  PARTIALLY_REFUNDED: 'تم رد جزء من المبلغ',
};

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

function dateTime(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

function orderTone(status: string) {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'SHIPPED') return 'blue';
  if (status === 'PROCESSING') return 'gold';
  return 'muted';
}

function paymentTone(status: string) {
  if (status === 'PAID' || status === 'CONFIRMED') return 'success';
  if (status === 'FAILED' || status === 'REFUNDED') return 'danger';
  return 'muted';
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER']);
  if (!user) return new NextResponse('غير مصرح', { status: 403 });

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true, email: true, addresses: true } },
        items: { orderBy: { id: 'asc' } },
      },
    });

    if (!order) return new NextResponse('الطلب غير موجود', { status: 404 });

    const customerName = order.customer?.name || order.customerNameSnapshot || 'زائر';
    const customerPhone = order.customer?.phone || order.customerPhoneSnapshot || '—';
    const address = order.shippingGovernorate
      ? [order.shippingGovernorate, order.shippingCity, order.shippingAddress].filter(Boolean).join('، ')
      : order.customer?.addresses?.[0]
        ? [order.customer.addresses[0].governorate, order.customer.addresses[0].city, order.customer.addresses[0].address].filter(Boolean).join('، ')
        : 'لا يوجد عنوان محفوظ';

    const itemsSubtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const discount = Number(order.discount || 0);
    const giftCardAmount = Number(order.giftCardAmount || 0);
    const shipping = Number(order.shipping || 0);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderStatus = statusLabels[order.status] || order.status;
    const paymentStatus = paymentStatusLabels[order.paymentStatus] || order.paymentStatus || '—';
    const paymentMethod = paymentLabels[order.paymentMethod] || order.paymentMethod || '—';

    const rows = order.items.map((item, index) => `
      <tr>
        <td class="cell-number">${(index + 1).toLocaleString('ar-EG')}</td>
        <td class="cell-product">
          <div class="product-name">${esc(item.name)}</div>
          ${item.variantName ? `<div class="product-meta">الخيار: ${esc(item.variantName)}</div>` : ''}
          ${item.skuSnapshot ? `<div class="product-meta">رمز المنتج: <span dir="ltr">${esc(item.skuSnapshot)}</span></div>` : ''}
        </td>
        <td class="cell-quantity">${item.quantity.toLocaleString('ar-EG')}</td>
        <td class="cell-money">${money(item.price)}</td>
        <td class="cell-money cell-total">${money(Number(item.price) * item.quantity)}</td>
      </tr>
    `).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<title>فاتورة #${esc(order.number)} | وَهَج</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  :root {
    color-scheme: light;
    --ink: #28231d;
    --muted: #777168;
    --line: #e9e3d8;
    --surface: #fbfaf7;
    --gold: #c6a46a;
    --gold-dark: #927443;
    --gold-pale: #f5efdf;
    --green: #32734c;
    --red: #a64d46;
    --blue: #466e93;
  }
  * { box-sizing: border-box; }
  html { background: #efede8; }
  body {
    min-height: 100vh;
    margin: 0;
    background: #efede8;
    color: var(--ink);
    font-family: "IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  button { font: inherit; }
  .screen-actions {
    width: min(210mm, calc(100% - 28px));
    margin: 18px auto 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .screen-hint { display: flex; align-items: center; gap: 9px; color: #716b61; font-size: 11px; }
  .screen-hint__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 4px rgba(198,164,106,.15); }
  .screen-actions__buttons { display: flex; gap: 8px; }
  .screen-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 15px;
    border: 1px solid #29241e;
    border-radius: 11px;
    background: #29241e;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    transition: transform .18s ease, opacity .18s ease;
  }
  .screen-actions button:hover { transform: translateY(-1px); opacity: .92; }
  .screen-actions button.secondary { border-color: #ded8ce; background: #fff; color: #4f4a42; }
  .screen-actions svg { width: 15px; height: 15px; }

  .invoice {
    position: relative;
    width: min(210mm, calc(100% - 28px));
    min-height: 277mm;
    margin: 0 auto 30px;
    overflow: hidden;
    border: 1px solid #e4ded3;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 22px 70px rgba(42, 35, 24, .12);
  }
  .invoice__accent { height: 5px; background: linear-gradient(90deg, #a98752, #dfc58e 48%, #a98752); }
  .invoice__header {
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    align-items: center;
    gap: 28px;
    padding: 30px 36px 24px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(115deg, #fff 56%, #fbf9f4);
  }
  .brand { display: flex; align-items: center; gap: 15px; min-width: 0; }
  .brand__logo-wrap { position: relative; display: grid; width: 84px; height: 84px; flex: 0 0 84px; place-items: center; overflow: hidden; padding: 6px; border: 1px solid #e8dec8; border-radius: 17px; background: linear-gradient(145deg, #fff, #fbf8f0); box-shadow: 0 5px 14px rgba(42, 35, 24, .06); }
  .brand__logo { display: block; width: 100%; height: 100%; object-fit: contain; transform: scale(1.05); transform-origin: center; }
  .brand__copy { min-width: 0; }
  .brand__name { margin: 0; color: #29231c; font-size: 18px; font-weight: 900; letter-spacing: -.03em; }
  .brand__caption { margin: 2px 0 0; color: var(--muted); font-size: 9px; }
  .brand__rule { display: block; width: 38px; height: 2px; margin-top: 8px; border-radius: 2px; background: var(--gold); }
  .invoice-heading { min-width: 210px; text-align: left; }
  .invoice-heading__eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--gold-dark); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
  .invoice-heading__eyebrow::before { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); content: ""; }
  .invoice-heading h1 { margin: 5px 0 3px; font-size: 27px; font-weight: 900; line-height: 1.2; letter-spacing: -.04em; }
  .invoice-heading__sub { margin: 0; color: var(--muted); font-size: 10px; }
  .invoice__meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 15px 36px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }
  .meta-item { min-width: 0; display: flex; align-items: center; gap: 10px; }
  .meta-item__icon { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 1px solid #e9dfca; border-radius: 11px; background: var(--gold-pale); color: var(--gold-dark); }
  .meta-item__icon svg { width: 16px; height: 16px; }
  .meta-item__copy { min-width: 0; }
  .meta-item__label { display: block; color: var(--muted); font-size: 8px; }
  .meta-item__value { display: block; margin-top: 1px; color: var(--ink); font-size: 11px; font-weight: 800; }
  .meta-item__value.ltr { direction: ltr; text-align: right; unicode-bidi: plaintext; }
  .invoice__content { padding: 24px 36px 27px; }
  .status-strip { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding: 12px 15px; border: 1px solid #eae2d2; border-radius: 13px; background: linear-gradient(100deg,#fbf9f4,#fff); }
  .status-strip__label { color: var(--muted); font-size: 9px; font-weight: 700; }
  .status-strip__pills { display: flex; flex-wrap: wrap; gap: 7px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; min-height: 25px; padding: 3px 9px; border: 1px solid #e6e0d7; border-radius: 999px; background: #fff; color: #5e594f; font-size: 8px; font-weight: 800; white-space: nowrap; }
  .pill::before { width: 5px; height: 5px; border-radius: 50%; background: currentColor; content: ""; }
  .pill--gold { border-color: #e6d8b8; background: var(--gold-pale); color: var(--gold-dark); }
  .pill--success { border-color: #d7e9dc; background: #f0f7f1; color: var(--green); }
  .pill--danger { border-color: #f0d8d5; background: #fff6f5; color: var(--red); }
  .pill--blue { border-color: #d7e3ed; background: #f1f6fa; color: var(--blue); }
  .pill--muted { border-color: #e6e0d7; background: #f8f7f4; color: #746e64; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .detail-card { min-width: 0; padding: 15px 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
  .detail-card__title { display: flex; align-items: center; gap: 8px; margin: 0 0 11px; color: var(--gold-dark); font-size: 10px; font-weight: 900; }
  .detail-card__title svg { width: 16px; height: 16px; color: var(--gold-dark); }
  .customer-name { margin: 0 0 5px; color: var(--ink); font-size: 14px; font-weight: 900; }
  .detail-line { display: flex; align-items: flex-start; gap: 7px; margin-top: 5px; color: #555047; font-size: 9px; line-height: 1.75; }
  .detail-line svg { width: 13px; height: 13px; flex: 0 0 auto; margin-top: 3px; color: #9a8354; }
  .detail-line__ltr { direction: ltr; unicode-bidi: plaintext; }
  .detail-card__hint { margin-top: 7px; color: #8a847a; font-size: 8px; }
  .items-section { margin-top: 24px; }
  .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
  .section-heading__title { display: flex; align-items: center; gap: 9px; margin: 0; color: var(--ink); font-size: 14px; font-weight: 900; }
  .section-heading__number { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #e8ddc4; border-radius: 9px; background: var(--gold-pale); color: var(--gold-dark); }
  .section-heading__number svg { width: 14px; height: 14px; }
  .items-count { color: var(--muted); font-size: 9px; }
  .items-table-wrap { overflow: hidden; border: 1px solid var(--line); border-radius: 13px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  thead th { padding: 10px 9px; border-bottom: 1px solid #e6dece; background: #f7f3e9; color: #6f582c; font-size: 9px; font-weight: 900; text-align: right; white-space: nowrap; }
  tbody td { padding: 11px 9px; border-bottom: 1px solid #efede8; color: #39342d; font-size: 9px; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:nth-child(even) { background: #fdfcf9; }
  .cell-number { width: 38px; color: #918a7e; text-align: center; }
  .cell-product { min-width: 190px; }
  .product-name { color: var(--ink); font-size: 10px; font-weight: 800; }
  .product-meta { margin-top: 2px; color: var(--muted); font-size: 8px; }
  .cell-quantity { width: 70px; text-align: center; font-weight: 800; }
  .cell-money { width: 125px; direction: ltr; text-align: left; white-space: nowrap; unicode-bidi: plaintext; }
  .cell-total { color: var(--gold-dark); font-weight: 900; }
  .summary-grid { display: grid; grid-template-columns: minmax(0,1fr) 275px; align-items: start; gap: 14px; margin-top: 18px; }
  .notes-card { min-height: 100px; padding: 14px 16px; border: 1px dashed #dcd3c2; border-radius: 13px; background: #fdfcf9; break-inside: avoid; page-break-inside: avoid; }
  .notes-card__title { display: flex; align-items: center; gap: 7px; margin: 0 0 7px; color: var(--gold-dark); font-size: 9px; font-weight: 900; }
  .notes-card__title svg { width: 14px; height: 14px; }
  .notes-card__text { color: #514b42; font-size: 9px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
  .totals-card { padding: 13px 15px 0; border: 1px solid var(--line); border-radius: 14px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
  .totals-card__title { margin: 0 0 7px; color: var(--gold-dark); font-size: 10px; font-weight: 900; }
  .total-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid #f0ede7; color: #625c52; font-size: 9px; }
  .total-row strong { color: var(--ink); font-size: 9px; font-weight: 800; white-space: nowrap; }
  .total-row--discount strong { color: var(--red); }
  .total-row--gift strong { color: var(--gold-dark); }
  .grand-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 9px -15px 0; padding: 13px 15px; border-top: 1px solid #d8c394; border-radius: 0 0 13px 13px; background: #2b261f; color: #fff; }
  .grand-total span { font-size: 10px; font-weight: 800; }
  .grand-total strong { color: #e0c88f; font-size: 15px; font-weight: 900; white-space: nowrap; }
  .invoice__footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); }
  .thank-you { color: var(--ink); font-size: 11px; font-weight: 900; }
  .thank-you span { display: block; margin-top: 2px; color: var(--muted); font-size: 8px; font-weight: 400; }
  .footer-mark { display: flex; align-items: center; gap: 7px; color: #8c8579; font-size: 8px; }
  .footer-mark__line { width: 22px; height: 1px; background: var(--gold); }
  .empty-row { padding: 22px; color: var(--muted); text-align: center; }

  @media (max-width: 680px) {
    .screen-hint { display: none; }
    .screen-actions { justify-content: flex-start; }
    .invoice { width: calc(100% - 16px); min-height: 0; border-radius: 14px; }
    .invoice__header { grid-template-columns: 1fr; gap: 18px; padding: 22px 19px 18px; }
    .brand__logo-wrap { width: 72px; height: 72px; flex-basis: 72px; padding: 5px; border-radius: 14px; }
    .invoice-heading { min-width: 0; text-align: right; }
    .invoice-heading h1 { font-size: 23px; }
    .invoice__meta { padding: 12px 19px; }
    .invoice__content { padding: 18px 15px 20px; }
    .status-strip { align-items: flex-start; flex-direction: column; }
    .details-grid { grid-template-columns: 1fr; gap: 9px; }
    .detail-card { padding: 13px; }
    .summary-grid { grid-template-columns: 1fr; }
    .totals-card { order: -1; }
    .items-table-wrap { overflow-x: auto; }
    table { min-width: 590px; }
    .invoice__footer { align-items: flex-start; flex-direction: column; gap: 9px; }
  }
  @media print {
    html, body { width: auto; min-height: 0; background: #fff; }
    body { font-size: 9px; line-height: 1.45; }
    .screen-actions { display: none !important; }
    .invoice { width: 100%; min-height: 277mm; margin: 0; overflow: visible; border: 0; border-radius: 0; box-shadow: none; }
    .invoice__accent { height: 3px; }
    .invoice__header { padding: 7mm 6mm 5mm; gap: 8mm; }
    .brand { gap: 3mm; }
    .brand__logo-wrap { width: 18mm; height: 18mm; flex-basis: 18mm; padding: 1mm; border-radius: 3mm; box-shadow: none; }
    .brand__name { font-size: 13pt; }
    .brand__caption { font-size: 7pt; }
    .brand__rule { width: 10mm; margin-top: 1.5mm; }
    .invoice-heading { min-width: 45mm; }
    .invoice-heading__eyebrow { font-size: 6.5pt; }
    .invoice-heading h1 { margin: 1mm 0; font-size: 20pt; }
    .invoice-heading__sub { font-size: 7pt; }
    .invoice__meta { padding: 3mm 6mm; gap: 3mm; }
    .meta-item { gap: 2mm; }
    .meta-item__icon { width: 8mm; height: 8mm; flex-basis: 8mm; border-radius: 2mm; }
    .meta-item__icon svg { width: 4mm; height: 4mm; }
    .meta-item__label { font-size: 6pt; }
    .meta-item__value { font-size: 7.5pt; }
    .invoice__content { padding: 5mm 6mm 5mm; }
    .status-strip { margin-bottom: 4mm; padding: 2mm 3mm; border-radius: 2mm; }
    .status-strip__label { font-size: 6.5pt; }
    .status-strip__pills { gap: 1.5mm; }
    .pill { min-height: 0; padding: 1mm 2mm; font-size: 6pt; }
    .pill::before { width: 1.2mm; height: 1.2mm; }
    .details-grid { gap: 2.5mm; }
    .detail-card { padding: 3mm 3.5mm; border-radius: 2.5mm; }
    .detail-card__title { gap: 1.5mm; margin-bottom: 2mm; font-size: 7pt; }
    .detail-card__title svg { width: 3.5mm; height: 3.5mm; }
    .customer-name { margin-bottom: 1mm; font-size: 9pt; }
    .detail-line { gap: 1.5mm; margin-top: 1mm; font-size: 7pt; }
    .detail-line svg { width: 3mm; height: 3mm; margin-top: .6mm; }
    .detail-card__hint { margin-top: 1mm; font-size: 6pt; }
    .items-section { margin-top: 5mm; }
    .section-heading { margin-bottom: 2mm; }
    .section-heading__title { gap: 2mm; font-size: 9pt; }
    .section-heading__number { width: 7mm; height: 7mm; border-radius: 2mm; }
    .section-heading__number svg { width: 3.5mm; height: 3.5mm; }
    .items-count { font-size: 6.5pt; }
    .items-table-wrap { border-radius: 2.5mm; }
    thead th { padding: 2mm 1.8mm; font-size: 6.5pt; }
    tbody td { padding: 2mm 1.8mm; font-size: 6.5pt; }
    .cell-number { width: 8mm; }
    .cell-product { min-width: 0; }
    .product-name { font-size: 7.5pt; }
    .product-meta { margin-top: .5mm; font-size: 6pt; }
    .cell-quantity { width: 14mm; }
    .cell-money { width: 29mm; font-size: 6.5pt; }
    .summary-grid { grid-template-columns: minmax(0,1fr) 68mm; gap: 3mm; margin-top: 4mm; }
    .notes-card { min-height: 23mm; padding: 3mm 3.5mm; border-radius: 2.5mm; }
    .notes-card__title { gap: 1.5mm; margin-bottom: 1.5mm; font-size: 6.5pt; }
    .notes-card__title svg { width: 3.5mm; height: 3.5mm; }
    .notes-card__text { font-size: 6.5pt; }
    .totals-card { padding: 2.5mm 3mm 0; border-radius: 2.5mm; }
    .totals-card__title { margin-bottom: 1mm; font-size: 7pt; }
    .total-row { padding: 1.5mm 0; font-size: 6.5pt; }
    .total-row strong { font-size: 6.5pt; }
    .grand-total { margin: 2mm -3mm 0; padding: 2.5mm 3mm; border-radius: 0 0 2.5mm 2.5mm; }
    .grand-total span { font-size: 7.5pt; }
    .grand-total strong { font-size: 10pt; }
    .invoice__footer { margin-top: 5mm; padding-top: 3mm; gap: 4mm; }
    .thank-you { font-size: 8pt; }
    .thank-you span { margin-top: .5mm; font-size: 6pt; }
    .footer-mark { gap: 1.5mm; font-size: 6pt; }
    .footer-mark__line { width: 6mm; }
    .detail-card, .notes-card, .totals-card, .items-table-wrap, tr { break-inside: avoid; page-break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
  @media (prefers-reduced-motion: reduce) { .screen-actions button { transition: none; } }
</style>
</head>
<body>
  <div class="screen-actions" aria-label="خيارات الفاتورة">
    <div class="screen-hint"><span class="screen-hint__dot"></span><span>معاينة فاتورة وَهَج · جاهزة للطباعة أو الحفظ PDF</span></div>
    <div class="screen-actions__buttons">
      <button type="button" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> طباعة / حفظ كـ PDF</button>
      <button type="button" class="secondary" onclick="window.close()">إغلاق</button>
    </div>
  </div>

  <main class="invoice">
    <div class="invoice__accent" aria-hidden="true"></div>
    <header class="invoice__header">
      <div class="brand">
        <div class="brand__logo-wrap"><img class="brand__logo" src="/images/wahaj.logo.png" alt="شعار وَهَج" /></div>
        <div class="brand__copy"><p class="brand__name">وَهَج</p><p class="brand__caption">متجر وَهَج الإلكتروني</p><span class="brand__rule" aria-hidden="true"></span></div>
      </div>
      <div class="invoice-heading"><span class="invoice-heading__eyebrow">مستند شراء إلكتروني</span><h1>فاتورة الطلب</h1><p class="invoice-heading__sub">تفاصيل عملية الشراء من متجر وَهَج</p></div>
    </header>

    <div class="invoice__meta">
      <div class="meta-item"><span class="meta-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l4 4v14H4V3h4Z"/><path d="M8 3v5h8V3M8 13h8M8 17h5"/></svg></span><span class="meta-item__copy"><span class="meta-item__label">رقم الفاتورة</span><b class="meta-item__value ltr">#${esc(order.number)}</b></span></div>
      <div class="meta-item"><span class="meta-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span><span class="meta-item__copy"><span class="meta-item__label">تاريخ إصدار الطلب</span><b class="meta-item__value">${esc(dateTime(order.createdAt))}</b></span></div>
    </div>

    <div class="invoice__content">
      <section class="status-strip" aria-label="حالة الطلب والدفع"><span class="status-strip__label">ملخص حالة الطلب</span><div class="status-strip__pills"><span class="pill pill--${orderTone(order.status)}">${esc(orderStatus)}</span><span class="pill pill--${paymentTone(order.paymentStatus)}">${esc(paymentStatus)}</span><span class="pill pill--muted">${esc(paymentMethod)}</span></div></section>

      <section class="details-grid" aria-label="بيانات الطلب والعميل">
        <article class="detail-card">
          <h2 class="detail-card__title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg> بيانات العميل</h2>
          <p class="customer-name">${esc(customerName)}</p>
          <div class="detail-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg><span class="detail-line__ltr">${esc(customerPhone)}</span></div>
          ${order.customer?.email ? `<div class="detail-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span class="detail-line__ltr">${esc(order.customer.email)}</span></div>` : ''}
        </article>
        <article class="detail-card">
          <h2 class="detail-card__title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg> عنوان الشحن</h2>
          <div class="detail-line"><span>${esc(address)}</span></div>
          <p class="detail-card__hint">${order.shippingProvider ? `شركة الشحن: ${esc(order.shippingProvider)}` : 'شركة الشحن: غير محددة'}${order.trackingNumber ? ` · رقم التتبع: <b dir="ltr">${esc(order.trackingNumber)}</b>` : ''}</p>
        </article>
      </section>

      <section class="items-section">
        <div class="section-heading"><h2 class="section-heading__title"><span class="section-heading__number"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg></span> تفاصيل المنتجات</h2><span class="items-count">${itemCount.toLocaleString('ar-EG')} وحدة · ${order.items.length.toLocaleString('ar-EG')} منتج</span></div>
        <div class="items-table-wrap"><table><thead><tr><th class="cell-number">م</th><th>المنتج</th><th class="cell-quantity">الكمية</th><th class="cell-money">سعر الوحدة</th><th class="cell-money">الإجمالي</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty-row">لا توجد منتجات مسجلة لهذا الطلب.</td></tr>'}</tbody></table></div>
      </section>

      <section class="summary-grid" aria-label="ملخص مبالغ الفاتورة">
        ${order.notes ? `<article class="notes-card"><h2 class="notes-card__title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg> ملاحظات الطلب</h2><div class="notes-card__text">${esc(order.notes)}</div></article>` : '<div aria-hidden="true"></div>'}
        <article class="totals-card"><h2 class="totals-card__title">ملخص الحساب</h2><div class="total-row"><span>إجمالي المنتجات</span><strong>${money(itemsSubtotal)}</strong></div>${discount > 0 ? `<div class="total-row total-row--discount"><span>خصم العروض</span><strong>− ${money(discount)}</strong></div>` : ''}<div class="total-row"><span>الشحن والتوصيل</span><strong>${money(shipping)}</strong></div>${giftCardAmount > 0 ? `<div class="total-row total-row--gift"><span>بطاقة الهدايا</span><strong>− ${money(giftCardAmount)}</strong></div>` : ''}<div class="grand-total"><span>الإجمالي النهائي</span><strong>${money(order.total)}</strong></div></article>
      </section>

      <footer class="invoice__footer"><div class="thank-you">شكرًا لاختيارك وَهَج<span>نتمنى أن تستمتعي بتجربتك معنا.</span></div><div class="footer-mark"><span class="footer-mark__line"></span><span>Wahaj Store · فاتورة إلكترونية</span></div></footer>
    </div>
  </main>
  <script>
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 450); });
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    });
  } catch (error: any) {
    console.error('Invoice Error:', error);
    return new NextResponse('حدث خطأ أثناء تجهيز الفاتورة.', { status: 500 });
  }
}
