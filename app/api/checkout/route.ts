import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { getCustomer } from '@/lib/customer-auth';
import { Prisma, PaymentMethod } from '@prisma/client';
import { del, put } from '@vercel/blob';
import { calculatePricing } from '@/lib/pricing';
import { recordInventoryEntry } from '@/lib/inventory';
import { notifyOrderCreated } from '@/lib/whatsapp';
import { notifyOrderCreatedByEmail } from '@/lib/email';
import { markLatestCartRecovered } from '@/lib/abandoned-cart';
import { hashGiftCardCode, normalizeGiftCardCode } from '@/lib/gift-card';

const Item = z.object({ productId: z.string().min(1), variantId: z.string().optional(), quantity: z.number().int().positive().max(50) });
const S = z.object({
  name: z.string().trim().min(2).max(100), phone: z.string().trim().min(8).max(30),
  governorate: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), address: z.string().trim().min(5).max(500), notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod), couponCode: z.string().trim().max(50).optional(), giftCardCode: z.string().trim().max(40).optional(),
  idempotencyKey: z.string().uuid().optional(), items: z.array(Item).min(1).max(100), paymentReference: z.string().trim().max(100).optional()
});

export async function POST(req: Request) {
  let idempotencyKey = '';
  let uploadedProofUrl: string | undefined;
  try {
    // جلب العميل المسجل حالياً في الجلسة (ان وجد)
    const loggedInCustomer = await getCustomer();

    const formData = await req.formData();
    const rawData = formData.get('data');
    if (typeof rawData !== 'string') return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    const b = S.parse(JSON.parse(rawData));
    const proofFile = formData.get('proof');
    const hasProofFile = proofFile instanceof File && proofFile.size > 0;
    idempotencyKey = b.idempotencyKey || crypto.randomUUID();
    const existing = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
    if (existing) return NextResponse.json({ ok: true, orderNumber: existing.number, total: Number(existing.total), shipping: Number(existing.shipping), discount: Number(existing.discount), replay: true });

    const normalizedPhone = normalizePhone(b.phone);
    const ids = [...new Set(b.items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: { variants: true } });
    if (products.length !== ids.length) return NextResponse.json({ error: 'أحد المنتجات غير متاح حالياً' }, { status: 400 });

    const pay = await prisma.paymentSetting.findUnique({ where: { method: b.paymentMethod } });
    if (!pay?.enabled) return NextResponse.json({ error: 'طريقة الدفع غير متاحة حالياً' }, { status: 400 });
    if (pay.proofRequired && !hasProofFile) return NextResponse.json({ error: 'إثبات الدفع مطلوب لهذه الطريقة' }, { status: 400 });

    if (hasProofFile) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'خدمة رفع إثبات الدفع غير مفعلة حالياً' }, { status: 503 });
      if (proofFile.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'حجم صورة الإيصال كبير جداً' }, { status: 400 });
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowedTypes.has(proofFile.type)) return NextResponse.json({ error: 'صيغة صورة الإيصال غير مدعومة' }, { status: 400 });
      const bytes = new Uint8Array(await proofFile.arrayBuffer());
      const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
      const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!isJpeg && !isPng && !isWebp) return NextResponse.json({ error: 'محتوى صورة الإيصال غير صالح' }, { status: 400 });

      const ext = proofFile.type === 'image/png' ? 'png' : proofFile.type === 'image/webp' ? 'webp' : 'jpg';
      const blob = await put(`wahaj/payment-proofs/${crypto.randomUUID()}.${ext}`, proofFile, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: proofFile.type, addRandomSuffix: false });
      uploadedProofUrl = blob.url;
    }

    const requested = b.items.map(i => {
      const p = products.find(x => x.id === i.productId)!;
      const v = i.variantId ? p.variants.find(x => x.id === i.variantId) : undefined;
      if (p.variants.length > 0 && !i.variantId) throw new Error(`اختاري خيارات المنتج ${p.name} أولاً`);
      if (i.variantId && !v) throw new Error('الخيار المحدد غير متاح');
      const stock = v ? v.stock : p.stock;
      if (stock < i.quantity) throw new Error(`الكمية المتاحة من ${p.name} غير كافية`);
      const price = v?.price != null ? Number(v.price) : Number(p.price);
      return { p, v, quantity: i.quantity, price };
    });

    const now = new Date();
    let coupon: { code: string; type: any; value: number; minOrder: number | null } | undefined;
    if (b.couponCode) {
      const found = await prisma.coupon.findUnique({ where: { code: b.couponCode.toUpperCase() } });
      if (!found || !found.active || (found.startsAt && found.startsAt > now) || (found.expiresAt && found.expiresAt < now) || (found.maxUses !== null && found.usedCount >= found.maxUses)) {
        return NextResponse.json({ error: 'الكوبون غير صالح أو انتهت صلاحيته' }, { status: 400 });
      }
      coupon = { code: found.code, type: found.type, value: Number(found.value), minOrder: found.minOrder === null ? null : Number(found.minOrder) };
      const subtotalBeforeDiscount = calculatePricing({ lines: requested.map(i => ({ quantity: i.quantity, unitPrice: i.price })), shippingPrice: 0, shippingFreeAbove: null }).subtotal;
      if (coupon.minOrder !== null && subtotalBeforeDiscount < coupon.minOrder) {
        return NextResponse.json({ error: `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrder.toLocaleString('ar-EG')} ج.م` }, { status: 400 });
      }
    }

    const zone = await prisma.shippingZone.findFirst({ where: { governorate: b.governorate, active: true, OR: [{ city: b.city }, { city: null }] }, orderBy: { city: 'desc' } });
    if (!zone) return NextResponse.json({ error: 'لا توجد منطقة شحن مفعلة لهذا العنوان' }, { status: 400 });

    const existingCustomer = loggedInCustomer?.id
      ? await prisma.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true, _count: { select: { orders: true } } } })
      : await prisma.customer.findUnique({ where: { phone: normalizedPhone }, select: { id: true, _count: { select: { orders: true } } } });
    const isFirstOrder = !existingCustomer || existingCustomer._count.orders === 0;

    const activeOffers = await prisma.offer.findMany({
      where: { active: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      select: { name: true, type: true, discountValue: true, startsAt: true, endsAt: true, active: true },
    });

    const pricing = calculatePricing({
      lines: requested.map(i => ({ quantity: i.quantity, unitPrice: i.price })),
      shippingPrice: Number(zone.price),
      shippingFreeAbove: zone.freeAbove === null ? null : Number(zone.freeAbove),
      coupon,
      offers: activeOffers.map(o => ({ ...o, discountValue: o.discountValue === null ? null : Number(o.discountValue) })),
      isFirstOrder,
      now,
    });
    const { subtotal, shipping, discount, total } = pricing;
    const couponCode = pricing.couponCode;
    const giftCardCode = b.giftCardCode ? normalizeGiftCardCode(b.giftCardCode) : undefined;

    const siteMin = await prisma.siteSetting.findUnique({ where: { key: 'minimum_order' } });
    const minimumOrder = Number(siteMin?.value || 0);
    if (minimumOrder > 0 && subtotal - discount < minimumOrder) return NextResponse.json({ error: `الحد الأدنى للطلب هو ${minimumOrder.toLocaleString('ar-EG')} ج.م` }, { status: 400 });

    const order = await prisma.$transaction(async tx => {
      let giftCardId: string | null = null;
      let giftCardAmount = 0;
      if (giftCardCode) {
        const card = await tx.giftCard.findFirst({ where: { OR: [{ codeHash: hashGiftCardCode(giftCardCode) }, { code: giftCardCode }] } });
        const valid = card && card.active && Number(card.balance) > 0 && (!card.expiresAt || card.expiresAt > new Date());
        if (!valid) throw new Error('بطاقة الهدايا غير صالحة أو منتهية أو بدون رصيد');
        giftCardId = card.id;
        giftCardAmount = Math.min(Number(card.balance), Math.max(0, Number(total)));
        if (giftCardAmount > 0) {
          const consumed = await tx.giftCard.updateMany({ where: { id: card.id, active: true, balance: { gte: giftCardAmount } }, data: { balance: { decrement: giftCardAmount } } });
          if (consumed.count !== 1) throw new Error('رصيد بطاقة الهدايا تغير، أعيدي المحاولة');
        }
      }
      if (couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: couponCode } });
        const now = new Date();
        if (!c || !c.active || (c.startsAt && c.startsAt > now) || (c.expiresAt && c.expiresAt < now) || (c.maxUses !== null && c.usedCount >= c.maxUses)) {
          throw new Error('الكوبون لم يعد متاحاً');
        }
      }
      const inventoryEntryIds: string[] = [];
      for (const i of requested) {
        if (i.v) {
          const r = await tx.productVariant.updateMany({ where: { id: i.v.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new Error(`المخزون غير كافٍ للمنتج ${i.p.name}`);
          const current = await tx.productVariant.findUnique({ where: { id: i.v.id }, select: { id: true, stock: true, name: true, value: true, sku: true } });
          if (!current) throw new Error('الخيار المحدد غير متاح');
          const entry = await recordInventoryEntry(tx, { productId: i.p.id, variantId: current.id, type: 'SALE', quantity: -i.quantity, balanceAfter: current.stock, productNameSnapshot: i.p.name, variantNameSnapshot: current.name, variantValueSnapshot: current.value, skuSnapshot: current.sku || i.p.sku, reason: 'خصم المخزون عند إنشاء الطلب', reference: 'CHECKOUT' });
          inventoryEntryIds.push(entry.id);
        } else {
          const r = await tx.product.updateMany({ where: { id: i.p.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new Error(`المخزون غير كافٍ للمنتج ${i.p.name}`);
          const current = await tx.product.findUnique({ where: { id: i.p.id }, select: { id: true, stock: true, name: true, sku: true } });
          if (!current) throw new Error('المنتج غير متاح');
          const entry = await recordInventoryEntry(tx, { productId: current.id, type: 'SALE', quantity: -i.quantity, balanceAfter: current.stock, productNameSnapshot: current.name, skuSnapshot: current.sku, reason: 'خصم المخزون عند إنشاء الطلب', reference: 'CHECKOUT' });
          inventoryEntryIds.push(entry.id);
        }
      }

      // تحديد العميل وربطه بدقة متناهية
      let c;
      if (loggedInCustomer?.id) {
        // إذا كان العميل مسجل الدخول، نعتمد حسابه الأساسي مباشرة بغض النظر عن رقم الهاتف المدخل في الـ Checkout
        c = await tx.customer.findUnique({ where: { id: loggedInCustomer.id } });
      }
      
      if (!c) {
        // إذا لم يكن مسجل الدخول، نبحث برقم الهاتف أو ننشئ حساباً جديداً
        c = await tx.customer.findUnique({ where: { phone: normalizedPhone } });
        if (!c) {
          c = await tx.customer.create({ data: { name: b.name, phone: normalizedPhone } });
        }
      } else {
        // تحديث الاسم إذا اختلف
        if (c.name !== b.name) {
          await tx.customer.update({ where: { id: c.id }, data: { name: b.name } });
        }
      }

      // حفظ العنوان الجديد ضمن عناوين العميل المحفوظة
      await tx.address.create({ data: { customerId: c.id, governorate: b.governorate, city: b.city, address: b.address, notes: b.notes } });

      const number = `WAH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const o = await tx.order.create({ data: {
        number, idempotencyKey, customerId: c.id, customerNameSnapshot: b.name, customerPhoneSnapshot: normalizedPhone,
        paymentMethod: b.paymentMethod, total: Math.max(0, total - giftCardAmount), shipping, discount, couponCode, giftCardId, giftCardAmount, notes: b.notes, shippingGovernorate: b.governorate, shippingCity: b.city, shippingAddress: b.address,
        items: { create: requested.map(i => ({ productId: i.p.id, variantId: i.v?.id, variantName: i.v?.name, variantValue: i.v?.value, skuSnapshot: i.v?.sku || i.p.sku, name: i.p.name, quantity: i.quantity, price: new Prisma.Decimal(i.price) })) },
        payments: { create: { method: b.paymentMethod, amount: Math.max(0, total - giftCardAmount), reference: b.paymentReference, proofUrl: uploadedProofUrl } },
        timeline: { create: { status: 'NEW', note: 'تم إنشاء الطلب' } }
      } });

      if (inventoryEntryIds.length) await tx.inventoryLedger.updateMany({ where: { id: { in: inventoryEntryIds } }, data: { orderId: o.id } });

      if (giftCardId && giftCardAmount > 0) {
        const cardAfter = await tx.giftCard.findUnique({ where: { id: giftCardId }, select: { balance: true } });
        await tx.giftCardLedger.create({ data: { giftCardId, type: 'REDEEM', amount: giftCardAmount, balanceAfter: cardAfter?.balance ?? 0, orderId: o.id, reference: o.number, customerId: o.customerId, note: 'استخدام بطاقة هدايا عند الدفع' } });
      }

      if (couponCode) {
        const current = await tx.coupon.findUnique({ where: { code: couponCode }, select: { maxUses: true } });
        const where: Prisma.CouponWhereInput = { code: couponCode, active: true };
        if (current?.maxUses !== null && current?.maxUses !== undefined) where.usedCount = { lt: current.maxUses };
        const consumed = await tx.coupon.updateMany({ where, data: { usedCount: { increment: 1 } } });
        if (consumed.count !== 1) throw new Error('الكوبون لم يعد متاحاً');
      }
      return o;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    const orderCustomer = order.customerId
      ? await prisma.customer.findUnique({ where: { id: order.customerId }, select: { email: true, name: true } })
      : null;
    if (order.customerId) await markLatestCartRecovered(order.customerId, order.id);

    await notifyOrderCreatedByEmail({
      email: orderCustomer?.email,
      name: orderCustomer?.name || order.customerNameSnapshot,
      orderNumber: order.number,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });

    await notifyOrderCreated({
      id: order.id,
      number: order.number,
      customerId: order.customerId,
      phone: order.customerPhoneSnapshot,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });

    return NextResponse.json({ ok: true, orderNumber: order.number, subtotal, shipping, discount, giftCardAmount: Number(order.giftCardAmount), total: Number(order.total) });
  } catch (e: any) {
    if (uploadedProofUrl) {
      try { await del(uploadedProofUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch {}
    }
    if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) && e.meta.target.includes('idempotencyKey')) {
      const replay = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
      if (replay) return NextResponse.json({ ok: true, orderNumber: replay.number, total: Number(replay.total), shipping: Number(replay.shipping), discount: Number(replay.discount), replay: true });
    }
    const status = e?.code === 'P2034' ? 409 : 400;
    return NextResponse.json({ error: e?.issues?.[0]?.message || e?.message || 'تعذر إنشاء الطلب' }, { status });
  }
}
