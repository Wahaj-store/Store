const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

type EmailRecipient = { email: string; name?: string | null };

type SendEmailInput = {
  to: EmailRecipient;
  subject: string;
  htmlContent: string;
};

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function brandHtml(content: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f7f5ef;font-family:Arial,sans-serif;color:#24211d"><div style="max-width:620px;margin:32px auto;padding:0 16px"><div style="background:#171614;color:#d4af37;padding:22px 24px;border-radius:16px 16px 0 0;text-align:center;font-size:24px;font-weight:700">متجر وَهَج</div><div style="background:#fff;padding:28px 24px;border:1px solid #e8e1d5;border-top:0;border-radius:0 0 16px 16px;line-height:1.9">${content}<p style="margin:28px 0 0;color:#888;font-size:12px">هذه رسالة آلية من متجر وَهَج.</p></div></div></body></html>`;
}

export async function sendBrevoEmail(input: SendEmailInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = normalizeEmail(process.env.SENDER_EMAIL);
  if (!apiKey || !senderEmail) return false;

  const recipientEmail = normalizeEmail(input.to.email);
  if (!recipientEmail) return false;

  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.SENDER_NAME || 'متجر وَهَج',
          email: senderEmail,
        },
        to: [{ email: recipientEmail, name: input.to.name || undefined }],
        subject: input.subject,
        htmlContent: input.htmlContent,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('Brevo email error:', response.status, details);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Brevo email request failed:', error);
    return false;
  }
}

export async function notifyOrderCreatedByEmail(input: {
  email?: string | null;
  name?: string | null;
  orderNumber: string;
  total: unknown;
  paymentMethod: string;
}) {
  if (!input.email) return false;
  return sendBrevoEmail({
    to: { email: input.email, name: input.name },
    subject: `تم استلام طلبك ${input.orderNumber} - متجر وَهَج`,
    htmlContent: brandHtml(`<h2 style="margin-top:0">شكرًا لطلبك${input.name ? ` يا ${escapeHtml(input.name)}` : ''} ✨</h2><p>تم استلام طلبك بنجاح.</p><p><strong>رقم الطلب:</strong> ${escapeHtml(input.orderNumber)}</p><p><strong>الإجمالي:</strong> ${escapeHtml(Number(input.total).toLocaleString('ar-EG'))} ج.م</p><p><strong>طريقة الدفع:</strong> ${escapeHtml(input.paymentMethod)}</p>`),
  });
}

export async function notifyOrderStatusByEmail(input: {
  email?: string | null;
  name?: string | null;
  orderNumber: string;
  status: string;
}) {
  if (!input.email) return false;
  const labels: Record<string, string> = { NEW: 'تم استلام الطلب', PROCESSING: 'جاري تجهيز الطلب', SHIPPED: 'تم شحن الطلب', DELIVERED: 'تم تسليم الطلب', CANCELLED: 'تم إلغاء الطلب' };
  const statusLabel = labels[input.status] || input.status;
  return sendBrevoEmail({
    to: { email: input.email, name: input.name },
    subject: `تحديث طلبك ${input.orderNumber} - ${statusLabel}`,
    htmlContent: brandHtml(`<h2 style="margin-top:0">تحديث حالة الطلب</h2><p>مرحبًا${input.name ? ` ${escapeHtml(input.name)}` : ''}،</p><p>حالة طلبك <strong>${escapeHtml(input.orderNumber)}</strong> أصبحت:</p><div style="margin:20px 0;padding:16px;border:1px solid #d4af37;border-radius:12px;text-align:center;font-weight:700;color:#8a6a00">${escapeHtml(statusLabel)}</div>`),
  });
}

export async function notifyShipmentByEmail(input: {
  email?: string | null;
  name?: string | null;
  orderNumber: string;
  status: string;
  provider?: string | null;
  trackingNumber?: string | null;
}) {
  if (!input.email) return false;
  const labels: Record<string, string> = { PENDING: 'قيد التجهيز', PROCESSING: 'جاري التجهيز', SHIPPED: 'تم الشحن', IN_TRANSIT: 'في الطريق', OUT_FOR_DELIVERY: 'خرج للتسليم', DELIVERED: 'تم التسليم', FAILED: 'تعذر التسليم', RETURNED: 'تمت إعادة الشحنة', CANCELLED: 'أُلغيت الشحنة' };
  const statusLabel = labels[input.status] || input.status;
  return sendBrevoEmail({
    to: { email: input.email, name: input.name },
    subject: `تحديث شحنتك للطلب ${input.orderNumber} - متجر وَهَج`,
    htmlContent: brandHtml(`<h2 style="margin-top:0">تحديث الشحنة</h2><p>حالة شحنتك للطلب <strong>${escapeHtml(input.orderNumber)}</strong>:</p><div style="margin:20px 0;padding:16px;border:1px solid #d4af37;border-radius:12px;text-align:center;font-weight:700;color:#8a6a00">${escapeHtml(statusLabel)}</div>${input.provider ? `<p><strong>شركة الشحن:</strong> ${escapeHtml(input.provider)}</p>` : ''}${input.trackingNumber ? `<p><strong>رقم التتبع:</strong> ${escapeHtml(input.trackingNumber)}</p>` : ''}`),
  });
}

export async function notifyReturnByEmail(input: {
  email?: string | null;
  name?: string | null;
  orderNumber: string;
  returnNumber: string;
  status: string;
}) {
  if (!input.email) return false;
  const labels: Record<string, string> = { REQUESTED: 'تم استلام طلب الإرجاع', APPROVED: 'تمت الموافقة على طلب الإرجاع', REJECTED: 'تم رفض طلب الإرجاع', RECEIVED: 'تم استلام المرتجع', REFUNDED: 'تم تنفيذ الاسترداد', CANCELLED: 'تم إلغاء طلب الإرجاع' };
  const statusLabel = labels[input.status] || input.status;
  return sendBrevoEmail({
    to: { email: input.email, name: input.name },
    subject: `تحديث طلب الإرجاع ${input.returnNumber} - متجر وَهَج`,
    htmlContent: brandHtml(`<h2 style="margin-top:0">تحديث طلب الإرجاع</h2><p>طلب الإرجاع <strong>${escapeHtml(input.returnNumber)}</strong> المرتبط بالطلب <strong>${escapeHtml(input.orderNumber)}</strong>:</p><div style="margin:20px 0;padding:16px;border:1px solid #d4af37;border-radius:12px;text-align:center;font-weight:700;color:#8a6a00">${escapeHtml(statusLabel)}</div>`),
  });
}

export async function notifyAbandonedCartByEmail(input: {
  email?: string | null;
  name?: string | null;
  items: Array<{
    name?: string | null;
    price?: number | string | null;
    quantity?: number | null;
    variantName?: string | null;
    variantValue?: string | null;
  }>;
  subtotal: unknown;
}) {
  if (!input.email) return false;

  const rows = input.items
    .map((item) => {
      const variant = [item.variantName, item.variantValue].filter(Boolean).join(' - ');
      const quantity = Math.max(0, Number(item.quantity || 0));
      const price = Number(item.price || 0);
      return `<tr><td style="padding:10px 8px;border-bottom:1px solid #eee">${escapeHtml(item.name || 'منتج')}${variant ? `<div style="font-size:12px;color:#888;margin-top:3px">${escapeHtml(variant)}</div>` : ''}</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${quantity}</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:left">${escapeHtml(price.toLocaleString('ar-EG'))} ج.م</td></tr>`;
    })
    .join('');

  return sendBrevoEmail({
    to: { email: input.email, name: input.name },
    subject: 'سلتك ما زالت في انتظارك - متجر وَهَج',
    htmlContent: brandHtml(`
      <h2 style="margin-top:0">سلتك ما زالت في انتظارك${input.name ? ` يا ${escapeHtml(input.name)}` : ''} ✨</h2>
      <p>وجدنا منتجاتك ما زالت محفوظة في سلة المشتريات. يمكنك العودة لإكمال طلبك في أي وقت.</p>
      ${rows ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px"><thead><tr><th style="padding:10px 8px;text-align:right;border-bottom:1px solid #ddd">المنتج</th><th style="padding:10px 8px;text-align:center;border-bottom:1px solid #ddd">الكمية</th><th style="padding:10px 8px;text-align:left;border-bottom:1px solid #ddd">السعر</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
      <p style="margin-bottom:0"><strong>الإجمالي:</strong> ${escapeHtml(Number(input.subtotal).toLocaleString('ar-EG'))} ج.م</p>
    `),
  });
}
