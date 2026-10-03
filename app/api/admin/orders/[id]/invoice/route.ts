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
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const rows = order.items.map((item, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td class="product-cell">
          <div class="product-name">${esc(item.name)}</div>
          ${item.variantName ? `<div class="meta">الخيار: ${esc(item.variantName)}</div>` : ''}
          ${item.skuSnapshot ? `<div class="meta">SKU: <span dir="ltr">${esc(item.skuSnapshot)}</span></div>` : ''}
        </td>
        <td class="center qty">${item.quantity}</td>
        <td class="price">${money(item.price)}</td>
        <td class="price strong">${money(Number(item.price) * item.quantity)}</td>
      </tr>
    `).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>فاتورة #${esc(order.number)} | Wahaj Store</title>
<style>
  @page { size: A4 portrait; margin: 5mm; }
  :root {
    color-scheme: light;
    --ink: #171717;
    --muted: #77736a;
    --line: #e9e4da;
    --soft: #faf8f4;
    --gold: #b18a3d;
    --gold-dark: #876522;
    --gold-soft: #f5eedf;
  }
  * { box-sizing: border-box; }
  html, body { min-height: 100%; }
  body {
    margin: 0;
    background: #f2f0ec;
    color: var(--ink);
    font-family: "IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.65;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .screen-actions {
    width: min(900px, calc(100% - 28px));
    margin: 18px auto 0;
    display: flex;
    justify-content: flex-start;
    gap: 8px;
  }
  .screen-actions button {
    border: 0;
    border-radius: 10px;
    padding: 10px 15px;
    background: #171717;
    color: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .screen-actions button.secondary { background: #e7e3dc; color: #222; }
  .invoice {
    width: min(900px, calc(100% - 28px));
    margin: 12px auto 28px;
    background: #fff;
    border: 1px solid #e6e0d6;
    box-shadow: 0 18px 55px rgba(25, 22, 17, .09);
    overflow: hidden;
  }
  .top-accent { height: 5px; background: var(--gold); }
  .header {
    padding: 28px 34px 24px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 24px;
    border-bottom: 1px solid var(--line);
  }
  .brand { text-align: right; }
  .logo {
    display: block;
    width: 180px;
    max-width: 100%;
    height: auto;
    object-fit: contain;
    object-position: right center;
  }
  .brand-caption { margin-top: 5px; color: var(--muted); font-size: 9px; letter-spacing: .7px; }
  .header-center { text-align: center; }
  .invoice-word {
    display: inline-block;
    color: var(--gold-dark);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 2px;
  }
  .header-center h1 { margin: 0; font-size: 27px; line-height: 1.15; font-weight: 800; }
  .header-center p { margin: 6px 0 0; color: var(--muted); font-size: 10px; }
  .header-meta { text-align: left; }
  .meta-label { color: var(--muted); font-size: 9px; margin-bottom: 2px; }
  .order-number { font-size: 16px; font-weight: 800; direction: ltr; unicode-bidi: plaintext; }
  .date { color: #5f5b54; font-size: 10px; margin-top: 3px; }

  .content { padding: 24px 34px 30px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 13px 15px;
    min-height: 108px;
    background: #fff;
    break-inside: avoid;
  }
  .section-label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 9px;
    color: var(--gold-dark);
    font-size: 10px;
    font-weight: 800;
  }
  .section-label::before { content: ""; width: 4px; height: 15px; border-radius: 5px; background: var(--gold); }
  .info-card p { margin: 3px 0; }
  .customer-name { font-size: 14px; font-weight: 800; }
  .small { color: var(--muted); font-size: 10px; }
  .status-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .pill { display: inline-flex; align-items: center; border: 1px solid #ded7ca; background: var(--soft); border-radius: 999px; padding: 3px 8px; font-size: 9px; font-weight: 700; }
  .pill.gold { border-color: #e1d2ad; background: var(--gold-soft); color: var(--gold-dark); }
  .address { line-height: 1.8; }

  .items-title { margin: 24px 0 9px; display: flex; justify-content: space-between; align-items: end; gap: 12px; }
  .items-title h2 { margin: 0; font-size: 14px; font-weight: 800; }
  .items-count { color: var(--muted); font-size: 9px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; }
  thead th { padding: 10px 8px; background: #f8f5ef; color: #6e5628; border-bottom: 1px solid #e5ddce; font-size: 9px; font-weight: 800; white-space: nowrap; }
  tbody td { padding: 11px 8px; border-bottom: 1px solid #eeeae3; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: 0; }
  .num { width: 38px; text-align: center; color: #aaa39a; font-size: 10px; }
  .product-cell { min-width: 220px; }
  .product-name { font-weight: 800; font-size: 11px; }
  .meta { margin-top: 2px; color: var(--muted); font-size: 8.5px; }
  .center { text-align: center; }
  .qty { font-weight: 700; }
  .price { text-align: left; white-space: nowrap; direction: ltr; unicode-bidi: plaintext; }
  .strong { font-weight: 800; }

  .bottom-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 22px; margin-top: 20px; align-items: start; }
  .notes-box { border: 1px dashed #d9d1c4; border-radius: 12px; padding: 13px 15px; background: #fcfbf9; min-height: 92px; break-inside: avoid; }
  .notes-box .section-label { margin-bottom: 6px; }
  .notes-text { color: #4f4b45; white-space: pre-wrap; }
  .totals { border: 1px solid var(--line); border-radius: 12px; padding: 13px 15px; break-inside: avoid; }
  .total-row { display: flex; justify-content: space-between; gap: 15px; padding: 6px 0; border-bottom: 1px solid #eeeae3; }
  .total-row span:first-child { color: #5f5b54; }
  .discount { color: #8d3434; }
  .gift { color: var(--gold-dark); }
  .final { margin: 8px -15px -13px; padding: 13px 15px; border-top: 2px solid var(--gold); border-bottom: 0; background: var(--gold-soft); border-radius: 0 0 11px 11px; font-size: 15px; font-weight: 900; }
  .final span:first-child { color: var(--ink); }
  .final strong { color: var(--gold-dark); }

  .footer {
    margin-top: 26px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 20px;
  }
  .thank-you { font-size: 12px; font-weight: 800; }
  .thank-you span { display: block; color: var(--muted); font-size: 9px; font-weight: 400; margin-top: 2px; }
  .footer-mark { text-align: left; color: #a39b8e; font-size: 8px; }

  @media print {
    html, body { width: 210mm; min-height: 297mm; }
    body {
      background: #fff;
      font-size: 9.5px;
      line-height: 1.35;
    }
    .screen-actions { display: none !important; }
    .invoice {
      width: auto;
      min-height: 0;
      margin: 0;
      border: 0;
      box-shadow: none;
      overflow: visible;
    }
    .top-accent { height: 2px; }
    .header {
      padding: 8px 12px 7px;
      gap: 10px;
      border-bottom: 1px solid var(--line);
    }
    .logo {
      width: 92px;
      max-height: 38px;
    }
    .brand-caption { display: none; }
    .invoice-word {
      font-size: 7px;
      letter-spacing: 1.2px;
      margin-bottom: 1px;
    }
    .header-center h1 {
      font-size: 18px;
      line-height: 1.1;
    }
    .header-center p { display: none; }
    .meta-label { font-size: 7px; margin-bottom: 1px; }
    .order-number { font-size: 11px; }
    .date { font-size: 7px; margin-top: 1px; }

    .content { padding: 9px 12px 10px; }

    .info-grid {
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info-card {
      border-radius: 7px;
      padding: 7px 9px;
      min-height: 0;
    }
    .section-label {
      gap: 5px;
      margin-bottom: 4px;
      font-size: 8px;
    }
    .section-label::before {
      width: 3px;
      height: 10px;
    }
    .info-card p { margin: 1px 0; }
    .customer-name { font-size: 10px; }
    .small { font-size: 7.5px; }
    .status-row { gap: 3px; margin-top: 3px; }
    .pill {
      padding: 2px 5px;
      font-size: 7px;
    }
    .address { line-height: 1.45; }

    .items-title {
      margin: 9px 0 4px;
    }
    .items-title h2 { font-size: 10px; }
    .items-count { font-size: 7px; }

    table {
      border-radius: 7px;
    }
    thead th {
      padding: 5px 5px;
      font-size: 7px;
    }
    tbody td {
      padding: 6px 5px;
    }
    .num {
      width: 24px;
      font-size: 7px;
    }
    .product-cell { min-width: 0; }
    .product-name { font-size: 8.5px; }
    .meta {
      margin-top: 1px;
      font-size: 6.5px;
    }
    .qty { font-size: 8px; }
    .price { font-size: 8px; }

    .bottom-grid {
      grid-template-columns: 1.1fr .9fr;
      gap: 9px;
      margin-top: 8px;
    }
    .notes-box {
      min-height: 45px;
      border-radius: 7px;
      padding: 7px 9px;
    }
    .notes-box .section-label { margin-bottom: 3px; }
    .notes-text { font-size: 7.5px; line-height: 1.4; }
    .totals {
      border-radius: 7px;
      padding: 7px 9px;
    }
    .total-row {
      padding: 3px 0;
      font-size: 7.5px;
    }
    .final {
      margin: 5px -9px -7px;
      padding: 7px 9px;
      border-top-width: 1px;
      border-radius: 0 0 6px 6px;
      font-size: 10px;
    }

    .footer {
      margin-top: 9px;
      padding-top: 7px;
      gap: 10px;
    }
    .thank-you { font-size: 8px; }
    .thank-you span { font-size: 6.5px; }
    .footer-mark { font-size: 6.5px; }

    .info-card, .notes-box, .totals, table {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
  @media (max-width: 720px) {
    .header { grid-template-columns: 1fr; text-align: center; }
    .brand, .header-meta { text-align: center; }
    .logo { margin: 0 auto; }
    .info-grid, .bottom-grid { grid-template-columns: 1fr; }
    .content { padding: 20px; }
    .header { padding: 22px 20px; }
    .invoice, .screen-actions { width: min(100% - 16px, 900px); }
    table { font-size: 10px; }
    .product-cell { min-width: 140px; }
  }
</style>
</head>
<body>
  <div class="screen-actions">
    <button type="button" onclick="window.print()">طباعة / حفظ كـ PDF</button>
    <button type="button" class="secondary" onclick="window.close()">إغلاق</button>
  </div>

  <main class="invoice">
    <div class="top-accent"></div>
    <header class="header">
      <div class="brand">
        <img class="logo" src="/images/wahaj.logo.png" alt="Wahaj Store" />
        <div class="brand-caption">متجر واجهة تسوق راقية</div>
      </div>

      <div class="header-center">
        <div class="invoice-word">INVOICE</div>
        <h1>فاتورة شراء</h1>
        <p>شكرًا لاختيارك Wahaj Store</p>
      </div>

      <div class="header-meta">
        <div class="meta-label">رقم الطلب</div>
        <div class="order-number">#${esc(order.number)}</div>
        <div class="date">${esc(dateTime(order.createdAt))}</div>
      </div>
    </header>

    <div class="content">
      <div class="info-grid">
        <section class="info-card">
          <div class="section-label">بيانات العميل</div>
          <p class="customer-name">${esc(customerName)}</p>
          <p dir="ltr">${esc(customerPhone)}</p>
          ${order.customer?.email ? `<p class="small" dir="ltr">${esc(order.customer.email)}</p>` : ''}
        </section>

        <section class="info-card">
          <div class="section-label">حالة الطلب والدفع</div>
          <p class="small">حالة الطلب</p>
          <div class="status-row">
            <span class="pill gold">${esc(statusLabels[order.status] || order.status)}</span>
            <span class="pill">${esc(paymentLabels[order.paymentMethod] || order.paymentMethod)}</span>
            <span class="pill">الدفع: ${esc(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)}</span>
          </div>
        </section>

        <section class="info-card">
          <div class="section-label">عنوان الشحن</div>
          <p class="address">${esc(address)}</p>
        </section>

        <section class="info-card">
          <div class="section-label">بيانات الشحن</div>
          <p>${order.shippingProvider ? `شركة الشحن: <strong>${esc(order.shippingProvider)}</strong>` : 'شركة الشحن: -'}</p>
          <p>${order.trackingNumber ? `رقم التتبع: <strong dir="ltr">${esc(order.trackingNumber)}</strong>` : 'رقم التتبع: -'}</p>
        </section>
      </div>

      <div class="items-title">
        <h2>تفاصيل المنتجات</h2>
        <div class="items-count">${itemCount} قطعة • ${order.items.length} منتج</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>المنتج</th>
            <th class="center">الكمية</th>
            <th class="price">سعر الوحدة</th>
            <th class="price">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" class="center">لا توجد منتجات</td></tr>'}
        </tbody>
      </table>

      <div class="bottom-grid">
        <div>
          ${order.notes ? `<section class="notes-box"><div class="section-label">ملاحظات الطلب</div><div class="notes-text">${esc(order.notes)}</div></section>` : '<div></div>'}
        </div>

        <section class="totals">
          <div class="section-label">ملخص الحساب</div>
          <div class="total-row"><span>إجمالي المنتجات</span><strong>${money(itemsSubtotal)}</strong></div>
          ${discount > 0 ? `<div class="total-row discount"><span>خصم العروض</span><strong>- ${money(discount)}</strong></div>` : ''}
          <div class="total-row"><span>الشحن</span><strong>${money(shipping)}</strong></div>
          ${giftCardAmount > 0 ? `<div class="total-row gift"><span>بطاقة الهدايا</span><strong>- ${money(giftCardAmount)}</strong></div>` : ''}
          <div class="total-row final"><span>الإجمالي النهائي</span><strong>${money(order.total)}</strong></div>
        </section>
      </div>

      <footer class="footer">
        <div class="thank-you">
          شكرًا لتسوقك من Wahaj Store
          <span>نتمنى أن تستمتع بتجربتك معنا.</span>
        </div>
        <div class="footer-mark">Wahaj Store • فاتورة إلكترونية</div>
      </footer>
    </div>
  </main>

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
