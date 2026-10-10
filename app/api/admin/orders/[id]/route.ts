import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma } from '@prisma/client';
import { syncShipmentFromOrderStatus } from '@/lib/shipment-sync';
import { notifyShipment } from '@/lib/whatsapp';
import { notifyOrderStatusByEmail, notifyShipmentByEmail } from '@/lib/email';
import { refundGiftCardForOrder } from '@/lib/gift-card';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { getPaymentProofUrl, isPrivatePaymentProofPath } from '@/lib/payment-proof';
import { updateOrderStatus } from '@/lib/order-service';

const ORDER_READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'];
const PAYMENT_PROOF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER'];

// 1. جلب تفاصيل الطلب مع خط السير
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser(ORDER_READ_ROLES);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const limit = await rateLimit(`admin-order-detail:${u.id}:${getClientKey(req)}`, 120, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقًا.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))), 'Cache-Control': 'private, no-store' } },
    );
  }
  
  try {
    const { id } = await params;
    
    const o = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, addresses: true } },
        items: { include: { product: true } },
        payments: true,
        timeline: { orderBy: { createdAt: 'desc' } },
        shipments: { orderBy: { createdAt: 'desc' }, include: { events: { orderBy: { createdAt: 'asc' } } } },
        returnRequests: { orderBy: { requestedAt: 'desc' }, include: { items: { include: { orderItem: true } } } },
      },
    });
    
    if (!o) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const canAccessPaymentProof = PAYMENT_PROOF_ROLES.includes(u.role);
    const payments = await Promise.all(o.payments.map(async (payment) => {
      const { proofUrl: storedProofPath, ...safePayment } = payment;
      if (!canAccessPaymentProof || !storedProofPath) return safePayment;
      if (!isPrivatePaymentProofPath(storedProofPath)) return { ...safePayment, proofUrl: null };

      try {
        return { ...safePayment, proofUrl: await getPaymentProofUrl(storedProofPath) };
      } catch (error) {
        console.error('PAYMENT_PROOF_SIGN_ERROR:', error instanceof Error ? error.message : 'unknown');
        return { ...safePayment, proofUrl: null };
      }
    }));

    return NextResponse.json(
      { ...o, payments },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('GET_ORDER_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر جلب تفاصيل الطلب حاليًا.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

// 2. تحديث حالة الطلب وتسجيلها في OrderTimeline
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, shippingProvider, trackingNumber, note } = body; 

    if (!status) {
      return NextResponse.json({ error: 'الحالة المطلوبة غير موجودة' }, { status: 400 });
    }

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json({ error: 'حالة الطلب غير صالحة' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const updatedOrder = await updateOrderStatus(tx, {
        orderId: id,
        status: status as OrderStatus,
        actorName: u.name || u.email,
        note,
        shippingProvider: shippingProvider !== undefined ? shippingProvider : undefined,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
      });
      const shipment = await syncShipmentFromOrderStatus(tx, id, status as OrderStatus, {
        provider: shippingProvider !== undefined ? shippingProvider : undefined,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
        note: note || `تمت مزامنة الشحنة مع حالة الطلب بواسطة ${u.name || u.email}`,
      });
      return { updatedOrder, shipment };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    const orderForEmail = await prisma.order.findUnique({ where: { id }, select: { number: true, status: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
    if (orderForEmail) {
      await notifyOrderStatusByEmail({ email: orderForEmail.customer?.email, name: orderForEmail.customer?.name || orderForEmail.customerNameSnapshot, orderNumber: orderForEmail.number, status: orderForEmail.status });
    }

    if (result.shipment) {
      const orderForNotification = await prisma.order.findUnique({ where: { id }, select: { id: true, number: true, customerId: true, customerPhoneSnapshot: true, customerNameSnapshot: true, customer: { select: { email: true, name: true } } } });
      if (orderForNotification) {
        await notifyShipment({
          id: result.shipment.id,
          orderId: id,
          orderNumber: orderForNotification.number,
          customerId: orderForNotification.customerId,
          phone: orderForNotification.customerPhoneSnapshot,
          status: result.shipment.status,
          provider: result.shipment.provider,
          trackingNumber: result.shipment.trackingNumber,
        });
        await notifyShipmentByEmail({
          email: orderForNotification.customer?.email,
          name: orderForNotification.customer?.name || orderForNotification.customerNameSnapshot,
          orderNumber: orderForNotification.number,
          status: result.shipment.status,
          provider: result.shipment.provider,
          trackingNumber: result.shipment.trackingNumber,
        });
      }
    }

    return NextResponse.json({ success: true, updatedOrder: result.updatedOrder });
  } catch (error: any) {
    console.error('PATCH Order Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}
