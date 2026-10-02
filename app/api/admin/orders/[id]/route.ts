import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma } from '@prisma/client';
import { syncShipmentFromOrderStatus } from '@/lib/shipment-sync';
import { notifyShipment } from '@/lib/whatsapp';
import { notifyOrderStatusByEmail } from '@/lib/email';

// 1. جلب تفاصيل الطلب مع خط السير
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  
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
      },
    });
    
    if (!o) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    return NextResponse.json(o);
  } catch (error: any) {
    console.error('GET Order Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الطلب: ' + error.message }, { status: 500 });
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
      const old = await tx.order.findUnique({ where: { id } });
      if (!old) throw new Error('الطلب غير موجود');
      if (old.status === 'DELIVERED' && status === 'CANCELLED') throw new Error('لا يمكن إلغاء طلب تم تسليمه');

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: status as OrderStatus,
          ...(shippingProvider !== undefined ? { shippingProvider } : {}),
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: status,
          note: note || `تم تحديث حالة الطلب إلى ${status} بواسطة ${u.name || u.email || 'المسؤول'}`,
        },
      });

      const shipment = await syncShipmentFromOrderStatus(tx, id, status as OrderStatus, {
        provider: shippingProvider !== undefined ? shippingProvider : old.shippingProvider,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : old.trackingNumber,
        note: note || `تمت مزامنة الشحنة مع حالة الطلب بواسطة ${u.name || u.email || 'المسؤول'}`,
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
