import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';

type WhatsAppTemplateOptions = {
  eventKey: string;
  phone: string;
  template: string;
  variables?: string[];
  customerId?: string | null;
  orderId?: string | null;
  language?: string;
};

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;
  if (!accessToken || !phoneNumberId || !graphVersion) return null;
  return { accessToken, phoneNumberId, graphVersion };
}

function normalizeRecipient(phone: string) {
  return normalizePhone(phone).replace(/\D/g, '');
}

function isRetryable(record: { status: string; updatedAt: Date }) {
  if (record.status !== 'PROCESSING') return true;
  return Date.now() - record.updatedAt.getTime() > 10 * 60 * 1000;
}

export async function sendWhatsAppTemplate(options: WhatsAppTemplateOptions) {
  const cfg = config();
  if (!cfg || !options.template) return { ok: false as const, skipped: true as const, reason: 'not_configured' };

  const phone = normalizeRecipient(options.phone);
  if (phone.length < 10) return { ok: false as const, skipped: true as const, reason: 'invalid_phone' };

  let record;
  try {
    record = await prisma.whatsAppNotification.create({
      data: {
        eventKey: options.eventKey,
        customerId: options.customerId || null,
        orderId: options.orderId || null,
        phone,
        template: options.template,
        language: options.language || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar',
        status: 'PROCESSING',
      },
    });
  } catch (error: any) {
    if (error?.code !== 'P2002') throw error;
    record = await prisma.whatsAppNotification.findUnique({ where: { eventKey: options.eventKey } });
    if (!record || record.status === 'SENT' || !isRetryable(record)) {
      return { ok: record?.status === 'SENT', skipped: true as const, reason: 'already_processed' };
    }
    await prisma.whatsAppNotification.update({ where: { id: record.id }, data: { status: 'PROCESSING', error: null } });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: options.template,
      language: { code: options.language || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar' },
      ...(options.variables?.length
        ? {
            components: [
              {
                type: 'body',
                parameters: options.variables.map(text => ({ type: 'text', text: String(text).slice(0, 1024) })),
              },
            ],
          }
        : {}),
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `WhatsApp API error (${response.status})`);
    const providerMessageId = data?.messages?.[0]?.id || null;
    await prisma.whatsAppNotification.update({
      where: { id: record.id },
      data: { status: 'SENT', providerMessageId, sentAt: new Date(), error: null },
    });
    return { ok: true as const, messageId: providerMessageId };
  } catch (error: any) {
    await prisma.whatsAppNotification.update({
      where: { id: record.id },
      data: { status: 'FAILED', error: String(error?.message || error).slice(0, 1000) },
    });
    console.error('WhatsApp notification failed:', error);
    return { ok: false as const, skipped: false as const, reason: 'provider_error' };
  }
}

export async function notifyOrderCreated(order: {
  id: string;
  number: string;
  customerId?: string | null;
  phone?: string | null;
  total: unknown;
  paymentMethod: string;
}) {
  const template = process.env.WHATSAPP_ORDER_CREATED_TEMPLATE;
  if (!template || !order.phone) return { ok: false as const, skipped: true as const, reason: 'template_not_configured' };
  return sendWhatsAppTemplate({
    eventKey: `order-created:${order.id}`,
    orderId: order.id,
    customerId: order.customerId,
    phone: order.phone,
    template,
    variables: [order.number, Number(order.total).toLocaleString('ar-EG'), order.paymentMethod],
  });
}

export async function notifyOrderStatus(order: {
  id: string;
  number: string;
  customerId?: string | null;
  phone?: string | null;
  status: string;
}) {
  const template = process.env.WHATSAPP_ORDER_STATUS_TEMPLATE;
  if (!template || !order.phone) return { ok: false as const, skipped: true as const, reason: 'template_not_configured' };
  const labels: Record<string, string> = {
    NEW: 'جديد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي',
  };
  return sendWhatsAppTemplate({
    eventKey: `order-status:${order.id}:${order.status}`,
    orderId: order.id,
    customerId: order.customerId,
    phone: order.phone,
    template,
    variables: [order.number, labels[order.status] || order.status],
  });
}

export async function notifyShipment(shipment: {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string | null;
  phone?: string | null;
  status: string;
  provider?: string | null;
  trackingNumber?: string | null;
}) {
  const template = process.env.WHATSAPP_SHIPMENT_TEMPLATE;
  if (!template || !shipment.phone) return { ok: false as const, skipped: true as const, reason: 'template_not_configured' };
  return sendWhatsAppTemplate({
    eventKey: `shipment:${shipment.id}:${shipment.status}`,
    orderId: shipment.orderId,
    customerId: shipment.customerId,
    phone: shipment.phone,
    template,
    variables: [shipment.orderNumber, shipment.status, shipment.provider || 'شركة الشحن', shipment.trackingNumber || 'بدون رقم تتبع'],
  });
}

export async function notifyReturn(returnRequest: {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string | null;
  phone?: string | null;
  status: string;
}) {
  const template = process.env.WHATSAPP_RETURN_TEMPLATE;
  if (!template || !returnRequest.phone) return { ok: false as const, skipped: true as const, reason: 'template_not_configured' };
  return sendWhatsAppTemplate({
    eventKey: `return:${returnRequest.id}:${returnRequest.status}`,
    orderId: returnRequest.orderId,
    customerId: returnRequest.customerId,
    phone: returnRequest.phone,
    template,
    variables: [returnRequest.orderNumber, returnRequest.status],
  });
                                                  }
  
