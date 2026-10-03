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
  CARD: 'بطاقة بنكية',
  WALLET: 'محفظة إلكترونية',
  BANK_TRANSFER: 'تحويل بنكي',
  INSTAPAY: 'InstaPay',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'معلق',
  PAID: 'مدفوع',
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
  if (!value) return '-';
  return new Date(value).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER']);
  if (!u) return new NextResponse('غير مصرح', { status: 403 });

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
    const customerPhone = order.customer?.phone || order.customerPhoneSnapshot || '-';
    const address = order.shippingGovernorate
      ? [order.shippingGovernorate, order.shippingCity, order.shippingAddress].filter(Boolean).join(' - ')
      : (order.customer?.addresses?.[0]
        ? [order.customer.addresses[0].governorate, order.customer.addresses[0].city, order.customer.addresses[0].address].filter(Boolean).join(' - ')
        : 'لا يوجد عنوان محفوظ');

    const itemsSubtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const discount = Number(order.discount || 0);
    const giftCardAmount = Number(order.giftCardAmount || 0);
    const shipping = Number(order.shipping || 0);

    const rows = order.items.map((item) => `
      <tr>
        <td>
          <strong>${esc(item.name)}</strong>
          ${item.variantName ? `<div class="muted">الخيار: ${esc(item.variantName)}</div>` : ''}
          ${item.skuSnapshot ? `<div class="muted">SKU: ${esc(item.skuSnapshot)}</div>` : ''}
        </td>
        <td class="center">${item.quantity}</td>
        <td>${money(item.price)}</td>
        <td>${money(Number(item.price) * item.quantity)}</td>
      </tr>
    `).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>فاتورة الطلب #${esc(order.number)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #161616; font-family: "IBM Plex Sans Arabic", "Noto Sans Arabic", Tahoma, Arial, sans-serif; font-size: 13px; line-height: 1.65; }
  .page { max-width: 820px; margin: 0 auto; padding: 8px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid #b28b38; }
  .brand { font-size: 25px; font-weight: 800; letter-spacing: .2px; }
  .brand-sub { color: #777; font-size: 11px; margin-top: 2px; }
  .invoice-title { text-align: left; }
  .invoice-title h1 { margin: 0; font-size: 24px; }
  .invoice-title p { margin: 4px 0 0; color: #666; font-size: 11px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
  .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; break-inside: avoid; }
  .box h2 { margin: 0 0 7px; font-size: 13px; color: #8b6b27; }
  .box p { margin: 3px 0; }
  .muted { color: #777; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { padding: 9px 7px; border-bottom: 1px solid #e5e5e5; vertical-align: top; text-align: right; }
  th { background: #f7f3e9; color: #6f5521; font-size: 11px; }
  .center { text-align: center; }
  .totals { width: min(100%, 390px); margin-right: auto; margin-top: 18px; }
  .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 6px 0; border-bottom: 1px solid #eee; }
  .total-row.final { border-top: 2px solid #b28b38; border-bottom: 0; margin-top: 5px; padding-top: 10px; font-size: 16px; font-weight: 800; }
  .discount { color: #9b2c2c; }
  .gift { color: #6f5521; }
  .notes { margin-top: 18px; border: 1px dashed #c9c9c9; border-radius: 10px; padding: 10px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; color: #777; font-size: 10px; }
  .actions { position: sticky; top: 0; display: flex; justify-content: flex-start; gap: 8px; padding: 10px 0; background: #fff; }
  button { border: 0; border-radius: 8px; padding: 9px 14px; background: #b28b38; color: #fff; font: inherit; cursor: pointer; }
  button.secondary { background: #eee; color: #222; }
  @media print { .actions { display: none; } .page { max-width: none; padding: 0; } }
  @media (max-width: 650px) { .grid { grid-template-columns: 1fr; } .top { flex-direction: column; } .invoice-title { text-align: right; } }
</style>
</head>
<body>
<div class="page">
  <div class="actions">
    <button onclick="window.print()">طباعة / حفظ كـ PDF</button>
    <button class="secondary" onclick="window.close()">إغلاق</button>
  </div>

  <header class="top">
    <div>
      <div class="brand">Wahaj Store</div>
      <div class="brand-sub">فاتورة طلب</div>
    </div>
    <div class="invoice-title">
      <h1>فاتورة #${esc(order.number)}</h1>
      <p>${esc(dateTime(order.createdAt))}</p>
    </div>
  </header>

  <div class="grid">
    <section class="box">
      <h2>بيانات العميل</h2>
      <p><strong>${esc(customerName)}</strong></p>
      <p dir="ltr">${esc(customerPhone)}</p>
      ${order.customer?.email ? `<p dir="ltr">${esc(order.customer.email)}</p>` : ''}
    </section>
    <section class="box">
      <h2>بيانات الطلب</h2>
      <p>الحالة: <strong>${esc(statusLabels[order.status] || order.status)}</strong></p>
      <p>الدفع: <strong>${esc(paymentLabels[order.paymentMethod] || order.paymentMethod)}</strong></p>
      <p>حالة الدفع: <strong>${esc(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)}</strong></p>
    </section>
    <section class="box">
      <h2>عنوان الشحن</h2>
      <p>${esc(address)}</p>
    </section>
    <section class="box">
      <h2>الشحن والتتبع</h2>
      <p>${order.shippingProvider ? `شركة الشحن: <strong>${esc(order.shippingProvider)}</strong>` : 'شركة الشحن: -'}</p>
      <p>${order.trackingNumber ? `رقم التتبع: <strong dir="ltr">${esc(order.trackingNumber)}</strong>` : 'رقم التتبع: -'}</p>
    </section>
  </div>

  <table>
    <thead><tr><th>المنتج</th><th class="center">الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="center">لا توجد منتجات</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>إجمالي المنتجات</span><strong>${money(itemsSubtotal)}</strong></div>
    ${discount > 0 ? `<div class="total-row discount"><span>الخصم (Offers)</span><strong>- ${money(discount)}</strong></div>` : ''}
    <div class="total-row"><span>الشحن</span><strong>${money(shipping)}</strong></div>
    ${giftCardAmount > 0 ? `<div class="total-row gift"><span>بطاقة الهدايا</span><strong>- ${money(giftCardAmount)}</strong></div>` : ''}
    <div class="total-row final"><span>الإجمالي النهائي</span><strong>${money(order.total)}</strong></div>
  </div>

  ${order.notes ? `<div class="notes"><strong>ملاحظات الطلب:</strong><div>${esc(order.notes)}</div></div>` : ''}

  <div class="footer">شكرًا لتسوقك من Wahaj Store</div>
</div>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 350);
  });
</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Invoice Error:', error);
    return new NextResponse('حدث خطأ أثناء تجهيز الفاتورة: ' + (error?.message || 'خطأ غير معروف'), { status: 500 });
  }
}
