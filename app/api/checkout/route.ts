import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { Prisma } from '@prisma/client';

const Item = z.object({ productId: z.string().min(1), variantId: z.string().optional(), quantity: z.number().int().positive().max(50) });
const S = z.object({
  name: z.string().trim().min(2).max(100), phone: z.string().trim().min(8).max(30),
  governorate: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), address: z.string().trim().min(5).max(500), notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(['COD','VODAFONE_CASH','INSTAPAY']), couponCode: z.string().trim().max(50).optional(),
  idempotencyKey: z.string().uuid().optional(), items: z.array(Item).min(1).max(100), paymentReference: z.string().trim().max(100).optional(), proofUrl: z.string().url().max(1000).optional()
});

export async function POST(req: Request) {
  try {
    const b = S.parse(await req.json());
    const idempotencyKey = b.idempotencyKey || crypto.randomUUID();
    const existing = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
    if (existing) return NextResponse.json({ ok: true, orderNumber: existing.number, total: Number(existing.total), shipping: Number(existing.shipping), discount: Number(existing.discount), replay: true });

    const normalizedPhone = normalizePhone(b.phone);
    const ids = [...new Set(b.items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: { variants: true } });
    if (products.length !== ids.length) return NextResponse.json({ error: 'أحد المنتجات غير متاح حالياً' }, { status: 400 });

    const pay = await prisma.paymentSetting.findUnique({ where: { method: b.paymentMethod } });
    if (!pay?.enabled) return NextResponse.json({ error: 'طريقة الدفع غير متاحة حالياً' }, { status: 400 });
    if (pay.proofRequired && !b.proofUrl) return NextResponse.json({ error: 'إثبات الدفع مطلوب لهذه الطريقة' }, { status: 400 });

    let subtotal = 0;
    const requested = b.items.map(i => {
      const p = products.find(x => x.id === i.productId)!;
      const v = i.variantId ? p.variants.find(x => x.id === i.variantId) : undefined;
      if (p.variants.length > 0 && !i.variantId) throw new Error(`اختاري خيارات المنتج ${p.name} أولاً`);
      if (i.variantId && !v) throw new Error('الخيار المحدد غير متاح');
      const stock = v ? v.stock : p.stock;
      if (stock < i.quantity) throw new Error(`الكمية المتاحة من ${p.name} غير كافية`);
      const price = v?.price != null ? Number(v.price) : Number(p.price);
      subtotal += price * i.quantity;
      return { p, v, quantity: i.quantity, price };
    });

    let discount = 0; let couponCode: string | undefined;
    if (b.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: b.couponCode.toUpperCase() } });
      const now = new Date();
      if (!coupon || !coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) return NextResponse.json({ error: 'الكوبون غير صالح أو انتهت صلاحيته' }, { status: 400 });
      if (coupon.minOrder !== null && subtotal < Number(coupon.minOrder)) return NextResponse.json({ error: `الحد الأدنى لاستخدام الكوبون هو ${Number(coupon.minOrder).toLocaleString('ar-EG')} ج.م` }, { status: 400 });
      discount = coupon.type === 'PERCENTAGE' ? Math.min(subtotal, subtotal * Number(coupon.value) / 100) : Math.min(subtotal, Number(coupon.value));
      couponCode = coupon.code;
    }

    const zone = await prisma.shippingZone.findFirst({ where: { governorate: b.governorate, active: true, OR: [{ city: b.city }, { city: null }] }, orderBy: { city: 'desc' } });
    if (!zone) return NextResponse.json({ error: 'لا توجد منطقة شحن مفعلة لهذا العنوان' }, { status: 400 });
    const shipping = zone.freeAbove !== null && subtotal - discount >= Number(zone.freeAbove) ? 0 : Number(zone.price);
    const siteMin=await prisma.siteSetting.findUnique({where:{key:'minimum_order'}}); const minimumOrder=Number(siteMin?.value||0); if(minimumOrder>0 && subtotal-discount<minimumOrder)return NextResponse.json({error:`الحد الأدنى للطلب هو ${minimumOrder.toLocaleString('ar-EG')} ج.م`},{status:400});
    const total = Math.max(0, subtotal + shipping - discount);

    const order = await prisma.$transaction(async tx => {
      // Re-check coupon and inventory inside the transaction to reduce race conditions.
      if (couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: couponCode } });
        const now = new Date();
        if (!c || !c.active || (c.startsAt && c.startsAt > now) || (c.expiresAt && c.expiresAt < now) || (c.maxUses !== null && c.usedCount >= c.maxUses)) {
          throw new Error('الكوبون لم يعد متاحاً');
        }
      }
      for (const i of requested) {
        if (i.v) {
          const r = await tx.productVariant.updateMany({ where: { id: i.v.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new Error(`المخزون غير كافٍ للمنتج ${i.p.name}`);
        } else {
          const r = await tx.product.updateMany({ where: { id: i.p.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new Error(`المخزون غير كافٍ للمنتج ${i.p.name}`);
        }
      }
      let c = await tx.customer.findUnique({ where: { phone: normalizedPhone } });
      if (!c) c = await tx.customer.create({ data: { name: b.name, phone: normalizedPhone } });
      else if (c.name !== b.name) await tx.customer.update({ where: { id: c.id }, data: { name: b.name } });
      await tx.address.create({ data: { customerId: c.id, governorate: b.governorate, city: b.city, address: b.address, notes: b.notes } });
      const number = `WAH-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
      const o = await tx.order.create({ data: {
        number, idempotencyKey, customerId: c.id, customerNameSnapshot: b.name, customerPhoneSnapshot: normalizedPhone,
        paymentMethod: b.paymentMethod, total, shipping, discount, couponCode, notes: b.notes, shippingGovernorate: b.governorate, shippingCity: b.city, shippingAddress: b.address,
        items: { create: requested.map(i => ({ productId: i.p.id, variantId: i.v?.id, variantName: i.v?.name, variantValue: i.v?.value, skuSnapshot: i.v?.sku || i.p.sku, name: i.p.name, quantity: i.quantity, price: i.price })) },
        payments: { create: { method: b.paymentMethod, amount: total, reference: b.paymentReference, proofUrl: b.proofUrl } },
        timeline: { create: { status: 'NEW', note: 'تم إنشاء الطلب' } }
      } });
      if (couponCode) {
        // Atomic coupon consumption: exactly one concurrent transaction may consume the final use.
        const current = await tx.coupon.findUnique({ where: { code: couponCode }, select: { maxUses: true } });
        const where: Prisma.CouponWhereInput = { code: couponCode, active: true };
        if (current?.maxUses !== null && current?.maxUses !== undefined) where.usedCount = { lt: current.maxUses };
        const consumed = await tx.coupon.updateMany({ where, data: { usedCount: { increment: 1 } } });
        if (consumed.count !== 1) throw new Error('الكوبون لم يعد متاحاً');
      }
      return o;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    return NextResponse.json({ ok: true, orderNumber: order.number, subtotal, shipping, discount, total });
  } catch (e: any) {
    if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) && e.meta.target.includes('idempotencyKey')) {
      const replay = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
      if (replay) return NextResponse.json({ ok: true, orderNumber: replay.number, total: Number(replay.total), shipping: Number(replay.shipping), discount: Number(replay.discount), replay: true });
    }
    const status = e?.code === 'P2034' ? 409 : 400;
    return NextResponse.json({ error: e?.issues?.[0]?.message || e?.message || 'تعذر إنشاء الطلب' }, { status });
  }
}
