import { after, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { getCustomer } from '@/lib/customer-auth';
import { Prisma } from '@prisma/client';
import { put } from '@vercel/blob';
import { getCustomerSegmentKey } from '@/lib/customer-segment';
import { calculatePricing, type OfferPricing } from '@/lib/pricing';
import { recordInventoryEntry } from '@/lib/inventory';
import { processOrderNotificationOutbox } from '@/lib/notification-outbox';
import { markLatestCartRecovered } from '@/lib/abandoned-cart';
import { hashGiftCardCode, normalizeGiftCardCode } from '@/lib/gift-card';
import { findActiveShippingZone, resolveShippingFreeAbove } from '@/lib/shipping';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { revalidateShopProducts } from '@/lib/shop-cache';
import { getCustomerOrderMetrics } from '@/lib/customer-order-metrics';
import { checkoutTotalsMatch } from '@/lib/checkout-preview-client';
import { CheckoutRequestSchema, type CheckoutRequest } from '@/lib/checkout-request-schema';
import { InvalidMultipartBodyError, MultipartBodyLimitError, parseBoundedMultipart } from '@/lib/bounded-multipart';
import {
  createPaymentProofPath,
  deletePaymentProof,
  PAYMENT_PROOF_MAX_BYTES,
  validatePaymentProof,
} from '@/lib/payment-proof';

export const maxDuration = 60;
const CHECKOUT_MAX_REQUEST_BYTES = PAYMENT_PROOF_MAX_BYTES + 256 * 1024;

class CheckoutDomainError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'CheckoutDomainError';
  }
}

class CheckoutPriceChangedError extends Error {
  constructor(readonly actualTotal: number) {
    super('تغيّر إجمالي الطلب أثناء إتمامه. راجعي الإجمالي المحدث ثم أكّدي الطلب مرة أخرى.');
    this.name = 'CheckoutPriceChangedError';
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  let idempotencyKey = '';
  let uploadedProofPath: string | undefined;
  try {
    const requestLimit = await rateLimit(`checkout:${getClientKey(req)}`, 12, 10 * 60 * 1000);
    if (!requestLimit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد محاولات إتمام الطلب. يرجى المحاولة مرة أخرى بعد قليل.' },
        { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' } },
      );
    }

    // جلب العميل المسجل حالياً في الجلسة (ان وجد)
    const loggedInCustomer = await getCustomer();

    const formData = await parseBoundedMultipart(req, CHECKOUT_MAX_REQUEST_BYTES);
    const formEntries = [...formData.entries()];
    if (formEntries.some(([key]) => key !== 'data' && key !== 'proof')) {
      return NextResponse.json({ error: 'يحتوي الطلب على حقول غير مسموح بها' }, { status: 400 });
    }
    const dataParts = formData.getAll('data');
    const proofParts = formData.getAll('proof');
    if (dataParts.length !== 1 || proofParts.length > 1 || proofParts.some((part) => typeof part === 'string')) {
      return NextResponse.json({ error: 'بيانات الطلب أو إثبات الدفع غير صالحة' }, { status: 400 });
    }
    const rawData = dataParts[0];
    if (typeof rawData !== 'string') return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    let b: CheckoutRequest;
    try {
      b = CheckoutRequestSchema.parse(JSON.parse(rawData));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
      }
      throw error;
    }
    const proofFile = proofParts[0];
    const hasProofFile = proofFile instanceof File && proofFile.size > 0;
    idempotencyKey = b.idempotencyKey;
    const existing = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
    if (existing) return NextResponse.json({ ok: true, orderNumber: existing.number, total: Number(existing.total), shipping: Number(existing.shipping), discount: Number(existing.discount), replay: true });

    const normalizedPhone = normalizePhone(b.phone);
    let checkoutName = b.name;
    let checkoutPhone = normalizedPhone;
    let checkoutGovernorate = b.governorate;
    let checkoutCity = b.city;
    let checkoutAddress = b.address;
    let checkoutNotes = b.notes;
    let selectedSavedAddress: { id: string } | null = null;
    if (loggedInCustomer?.id) {
      const account = await prisma.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true, name: true, phone: true } });
      if (!account) return NextResponse.json({ error: 'جلسة العضو غير صالحة، يرجى تسجيل الدخول مرة أخرى' }, { status: 401 });
      checkoutName = account.name?.trim() || checkoutName;
      checkoutPhone = normalizePhone(account.phone || '');
      if (!checkoutPhone) return NextResponse.json({ error: 'لا يوجد رقم هاتف أساسي صالح في حساب العضو' }, { status: 400 });
      if (b.addressId) {
        const saved = await prisma.address.findFirst({ where: { id: b.addressId, customerId: account.id }, select: { id: true, governorate: true, city: true, address: true, notes: true } });
        if (!saved) return NextResponse.json({ error: 'العنوان المختار غير موجود في حسابك' }, { status: 400 });
        selectedSavedAddress = saved;
        checkoutGovernorate = saved.governorate;
        checkoutCity = saved.city;
        checkoutAddress = saved.address;
        checkoutNotes = saved.notes || b.notes;
      }
    }
    const ids = [...new Set(b.items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: { variants: true } });
    if (products.length !== ids.length) return NextResponse.json({ error: 'أحد المنتجات غير متاح حالياً' }, { status: 400 });

    const pay = await prisma.paymentSetting.findUnique({ where: { method: b.paymentMethod } });
    if (!pay?.enabled) return NextResponse.json({ error: 'طريقة الدفع غير متاحة حالياً' }, { status: 400 });
    if (pay.proofRequired && !hasProofFile) return NextResponse.json({ error: 'إثبات الدفع مطلوب لهذه الطريقة' }, { status: 400 });

    for (const item of b.items) {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId) : undefined;
      if (product.variants.length > 0 && !item.variantId) throw new CheckoutDomainError(`اختاري خيارات المنتج ${product.name} أولاً`);
      if (item.variantId && !variant) throw new CheckoutDomainError('الخيار المحدد غير متاح');
      const availableStock = variant ? variant.stock : product.stock;
      if (availableStock < item.quantity) throw new CheckoutDomainError(`الكمية المتاحة من ${product.name} غير كافية`, 409);
    }

    const preflightZone = await findActiveShippingZone(checkoutGovernorate, checkoutCity);
    if (!preflightZone) return NextResponse.json({ error: 'لا توجد منطقة شحن مفعلة لهذا العنوان' }, { status: 400 });
    const giftCardCode = b.giftCardCode ? normalizeGiftCardCode(b.giftCardCode) : undefined;

    // لا نرفع الملف إلا بعد اجتياز عمليات التحقق التي قد تنهي الطلب مبكرًا.
    // وإذا فشلت المعاملة بعد الرفع، يتولى catch حذف الملف الخاص.
    if (hasProofFile) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'خدمة رفع إثبات الدفع غير مفعلة حالياً' }, { status: 503 });
      if (proofFile.size > PAYMENT_PROOF_MAX_BYTES) return NextResponse.json({ error: 'حجم صورة الإيصال كبير جداً' }, { status: 400 });
      let extension;
      try {
        ({ extension } = await validatePaymentProof(proofFile));
      } catch (error) {
        throw new CheckoutDomainError(error instanceof Error ? error.message : 'تعذر التحقق من صورة إثبات الدفع', 400);
      }
      const pathname = createPaymentProofPath(extension);
      const blob = await put(pathname, proofFile, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: proofFile.type, addRandomSuffix: false });
      uploadedProofPath = blob.pathname;
    }

    const { order, settledSubtotal } = await prisma.$transaction(async tx => {
      const transactionNow = new Date();
      const transactionPayment = await tx.paymentSetting.findUnique({
        where: { method: b.paymentMethod },
        select: { enabled: true, proofRequired: true },
      });
      if (!transactionPayment?.enabled) throw new CheckoutDomainError('طريقة الدفع غير متاحة حالياً');
      if (transactionPayment.proofRequired && !hasProofFile) throw new CheckoutDomainError('إثبات الدفع مطلوب لهذه الطريقة');

      const transactionProducts = await tx.product.findMany({
        where: { id: { in: ids }, status: 'PUBLISHED' },
        include: { variants: true },
      });
      if (transactionProducts.length !== ids.length) throw new CheckoutDomainError('أحد المنتجات لم يعد متاحًا حالياً', 409);
      const transactionRequested = b.items.map((item) => {
        const product = transactionProducts.find((candidate) => candidate.id === item.productId);
        if (!product) throw new CheckoutDomainError('أحد المنتجات لم يعد متاحًا حالياً', 409);
        const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId) : undefined;
        if (product.variants.length > 0 && !item.variantId) throw new CheckoutDomainError(`اختاري خيارات المنتج ${product.name} أولاً`);
        if (item.variantId && !variant) throw new CheckoutDomainError('الخيار المحدد لم يعد متاحًا', 409);
        const price = variant?.price != null ? Number(variant.price) : Number(product.price);
        return { p: product, v: variant, quantity: item.quantity, price, categoryId: product.categoryId };
      });

      const transactionZone = await findActiveShippingZone(checkoutGovernorate, checkoutCity, tx);
      if (!transactionZone) throw new CheckoutDomainError('لا توجد منطقة شحن مفعلة لهذا العنوان');
      const transactionShippingFreeAbove = await resolveShippingFreeAbove(transactionZone, tx);
      const transactionCustomer = loggedInCustomer?.id
        ? await tx.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true } })
        : await tx.customer.findUnique({ where: { phone: normalizedPhone }, select: { id: true } });
      const transactionCustomerMetrics = transactionCustomer
        ? await getCustomerOrderMetrics(transactionCustomer.id, tx)
        : { orderCount: 0, spend: 0, lastOrder: null };
      const transactionOffers = await tx.offer.findMany({
        where: {
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: transactionNow } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: transactionNow } }] }],
        },
        select: {
          id: true, name: true, type: true, discountType: true, discountValue: true,
          minOrder: true, maxDiscount: true, priority: true, stackable: true,
          maxUses: true, usedCount: true, productId: true, categoryId: true,
          buyQuantity: true, getQuantity: true, getDiscountPercent: true,
          startsAt: true, endsAt: true, active: true,
          segmentTargets: { select: { segmentKey: true } },
        },
      });
      const transactionPricing = calculatePricing({
        lines: transactionRequested.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.price,
          productId: item.p.id,
          categoryId: item.p.categoryId,
        })),
        shippingPrice: Number(transactionZone.price),
        shippingFreeAbove: transactionShippingFreeAbove,
        offers: transactionOffers.map((offer): OfferPricing => ({
          id: offer.id,
          name: offer.name,
          type: offer.type,
          discountType: offer.discountType,
          discountValue: offer.discountValue === null ? null : Number(offer.discountValue),
          minOrder: offer.minOrder === null ? null : Number(offer.minOrder),
          maxDiscount: offer.maxDiscount === null ? null : Number(offer.maxDiscount),
          priority: offer.priority,
          stackable: offer.stackable,
          maxUses: offer.maxUses,
          usedCount: offer.usedCount,
          productId: offer.productId,
          categoryId: offer.categoryId,
          buyQuantity: offer.buyQuantity,
          getQuantity: offer.getQuantity,
          getDiscountPercent: offer.getDiscountPercent === null ? null : Number(offer.getDiscountPercent),
          startsAt: offer.startsAt,
          endsAt: offer.endsAt,
          active: offer.active,
          segmentKeys: offer.segmentTargets.map((target) => target.segmentKey),
        })),
        isFirstOrder: transactionCustomerMetrics.orderCount === 0,
        customerSegmentKey: transactionCustomer
          ? getCustomerSegmentKey({ ...transactionCustomerMetrics, now: transactionNow })
          : null,
        now: transactionNow,
      });
      const transactionGiftWrapFlag = await tx.featureFlag.findUnique({ where: { key: 'gift_wrap' }, select: { enabled: true } });
      const transactionGiftWrapSelected = b.giftWrap === true && transactionGiftWrapFlag?.enabled === true;
      const transactionGiftWrapSetting = transactionGiftWrapSelected
        ? await tx.siteSetting.findUnique({ where: { key: 'gift_wrap_fee' }, select: { value: true } })
        : null;
      const transactionGiftWrapFeeValue = Number(transactionGiftWrapSetting?.value || 0);
      const transactionGiftWrapFee = transactionGiftWrapSelected && Number.isFinite(transactionGiftWrapFeeValue)
        ? Math.max(0, Math.min(100000, transactionGiftWrapFeeValue))
        : 0;
      const transactionTotal = transactionPricing.total + transactionGiftWrapFee;
      const transactionMinimumSetting = await tx.siteSetting.findUnique({ where: { key: 'minimum_order' }, select: { value: true } });
      const transactionMinimumOrder = Number(transactionMinimumSetting?.value || 0);
      if (transactionMinimumOrder > 0 && transactionPricing.subtotal - transactionPricing.discount < transactionMinimumOrder) {
        throw new CheckoutDomainError(`الحد الأدنى للطلب هو ${transactionMinimumOrder.toLocaleString('ar-EG')} ج.م`);
      }
      const transactionGiftWrapNote = transactionGiftWrapSelected
        ? `خدمة تغليف هدايا: ${transactionGiftWrapFee.toLocaleString('ar-EG')} ج.م`
        : '';
      const transactionCustomerNotes = (checkoutNotes || '').trim().slice(0, Math.max(0, 999 - transactionGiftWrapNote.length));
      const transactionOrderNotes = [transactionCustomerNotes, transactionGiftWrapNote].filter(Boolean).join('\n') || undefined;

      let giftCardId: string | null = null;
      let giftCardAmount = 0;
      if (giftCardCode) {
        const card = await tx.giftCard.findFirst({ where: { OR: [{ codeHash: hashGiftCardCode(giftCardCode) }, { code: giftCardCode }] } });
        const valid = card && card.active && Number(card.balance) > 0 && (!card.expiresAt || card.expiresAt > new Date());
        if (!valid) throw new CheckoutDomainError('بطاقة الهدايا غير صالحة أو منتهية أو بدون رصيد');
        giftCardId = card.id;
        giftCardAmount = Math.min(Number(card.balance), Math.max(0, transactionTotal));
        const actualTotal = Math.max(0, transactionTotal - giftCardAmount);
        if (!checkoutTotalsMatch(b.expectedTotal, actualTotal)) {
          throw new CheckoutPriceChangedError(actualTotal);
        }
        if (giftCardAmount > 0) {
          const consumed = await tx.giftCard.updateMany({ where: { id: card.id, active: true, balance: { gte: giftCardAmount } }, data: { balance: { decrement: giftCardAmount } } });
          if (consumed.count !== 1) throw new CheckoutDomainError('رصيد بطاقة الهدايا تغير، أعيدي المحاولة', 409);
        }
      } else if (!checkoutTotalsMatch(b.expectedTotal, transactionTotal)) {
        throw new CheckoutPriceChangedError(Math.max(0, transactionTotal));
      }
      const inventoryEntryIds: string[] = [];
      for (const i of transactionRequested) {
        if (i.v) {
          const r = await tx.productVariant.updateMany({ where: { id: i.v.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new CheckoutDomainError(`المخزون غير كافٍ للمنتج ${i.p.name}`, 409);
          const current = await tx.productVariant.findUnique({ where: { id: i.v.id }, select: { id: true, stock: true, name: true, value: true, sku: true } });
          if (!current) throw new CheckoutDomainError('الخيار المحدد غير متاح', 409);
          const entry = await recordInventoryEntry(tx, { productId: i.p.id, variantId: current.id, type: 'SALE', quantity: -i.quantity, balanceAfter: current.stock, productNameSnapshot: i.p.name, variantNameSnapshot: current.name, variantValueSnapshot: current.value, skuSnapshot: current.sku || i.p.sku, reason: 'خصم المخزون عند إنشاء الطلب', reference: 'CHECKOUT' });
          inventoryEntryIds.push(entry.id);
        } else {
          const r = await tx.product.updateMany({ where: { id: i.p.id, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count !== 1) throw new CheckoutDomainError(`المخزون غير كافٍ للمنتج ${i.p.name}`, 409);
          const current = await tx.product.findUnique({ where: { id: i.p.id }, select: { id: true, stock: true, name: true, sku: true } });
          if (!current) throw new CheckoutDomainError('المنتج غير متاح', 409);
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
          c = await tx.customer.create({ data: { name: checkoutName, phone: normalizedPhone } });
        }
      } else {
        // تحديث الاسم إذا اختلف
        if (!loggedInCustomer?.id && c.name !== checkoutName) {
          await tx.customer.update({ where: { id: c.id }, data: { name: checkoutName } });
        }
      }

      // العنوان المحفوظ تم التحقق من ملكيته؛ لا ننشئ نسخة مكررة عند إعادة الطلب.
      if (!selectedSavedAddress) {
        await tx.address.create({ data: { customerId: c.id, name: checkoutName, phone: checkoutPhone, governorate: checkoutGovernorate, city: checkoutCity, address: checkoutAddress, notes: checkoutNotes } });
      }

      const number = `WAH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const o = await tx.order.create({ data: {
        number, idempotencyKey, customerId: c.id, customerNameSnapshot: checkoutName, customerPhoneSnapshot: checkoutPhone,
        paymentMethod: b.paymentMethod, total: Math.max(0, transactionTotal - giftCardAmount), shipping: transactionPricing.shipping, discount: transactionPricing.discount, giftCardId, giftCardAmount, notes: transactionOrderNotes || checkoutNotes, shippingGovernorate: checkoutGovernorate, shippingCity: checkoutCity, shippingAddress: checkoutAddress,
        items: { create: transactionRequested.map(i => ({ productId: i.p.id, variantId: i.v?.id, variantName: i.v?.name, variantValue: i.v?.value, skuSnapshot: i.v?.sku || i.p.sku, name: i.p.name, quantity: i.quantity, price: new Prisma.Decimal(i.price) })) },
        payments: { create: { method: b.paymentMethod, amount: Math.max(0, transactionTotal - giftCardAmount), reference: b.paymentReference, proofUrl: uploadedProofPath } },
        timeline: { create: { status: 'NEW', note: 'تم إنشاء الطلب' } }
      } });

      if (c.email) {
        await tx.notificationOutbox.create({
          data: {
            eventKey: `order-created:email:${o.id}`,
            orderId: o.id,
            channel: 'EMAIL_ORDER_CREATED',
            payload: {
              email: c.email,
              name: c.name || checkoutName,
              orderNumber: o.number,
              total: Number(o.total),
              paymentMethod: o.paymentMethod,
            },
          },
        });
      }

      if (checkoutPhone && process.env.WHATSAPP_ORDER_CREATED_TEMPLATE) {
        await tx.notificationOutbox.create({
          data: {
            eventKey: `order-created:whatsapp:${o.id}`,
            orderId: o.id,
            channel: 'WHATSAPP_ORDER_CREATED',
            payload: {
              id: o.id,
              number: o.number,
              customerId: o.customerId,
              phone: checkoutPhone,
              total: Number(o.total),
              paymentMethod: o.paymentMethod,
            },
          },
        });
      }

      if (inventoryEntryIds.length) await tx.inventoryLedger.updateMany({ where: { id: { in: inventoryEntryIds } }, data: { orderId: o.id } });

      if (giftCardId && giftCardAmount > 0) {
        const cardAfter = await tx.giftCard.findUnique({ where: { id: giftCardId }, select: { balance: true } });
        await tx.giftCardLedger.create({ data: { giftCardId, type: 'REDEEM', amount: giftCardAmount, balanceAfter: cardAfter?.balance ?? 0, orderId: o.id, reference: o.number, customerId: o.customerId, note: 'استخدام بطاقة هدايا عند الدفع' } });
      }

      if (transactionPricing.appliedOffers.length) {
        for (const applied of transactionPricing.appliedOffers) {
          const currentOffer = await tx.offer.findUnique({ where: { id: applied.id }, select: { maxUses: true } });
          const where: Prisma.OfferWhereInput = { id: applied.id, active: true };
          if (currentOffer?.maxUses !== null && currentOffer?.maxUses !== undefined) {
            where.usedCount = { lt: currentOffer.maxUses };
          }
          const consumedOffer = await tx.offer.updateMany({ where, data: { usedCount: { increment: 1 } } });
          if (consumedOffer.count !== 1) throw new CheckoutDomainError('أحد العروض لم يعد متاحاً', 409);
        }
      }
      return { order: o, settledSubtotal: transactionPricing.subtotal };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    // تم حفظ إثبات الدفع مع الطلب؛ لا نحذفه في حال تعثرت معالجة جانبية بعد نجاح المعاملة.
    uploadedProofPath = undefined;
    try {
      revalidateShopProducts();
    } catch (error) {
      console.error('CHECKOUT_CACHE_REVALIDATION_ERROR:', error instanceof Error ? error.message : 'unknown');
    }
    if (order.customerId) {
      try {
        await markLatestCartRecovered(order.customerId, order.id);
      } catch (error) {
        console.error('CHECKOUT_CART_RECOVERY_ERROR:', error instanceof Error ? error.message : 'unknown');
      }
    }

    // The durable outbox is committed before response; provider latency no longer
    // blocks checkout. Cron remains the recovery path if this post-response task
    // is interrupted by the hosting platform.
    after(async () => {
      try {
        const result = await processOrderNotificationOutbox(order.id);
        if (result.failed > 0) {
          console.error('CHECKOUT_NOTIFICATION_OUTBOX_PARTIAL_FAILURE:', {
            orderId: order.id,
            ...result,
          });
        }
      } catch (error) {
        console.error(
          'CHECKOUT_NOTIFICATION_OUTBOX_ERROR:',
          error instanceof Error ? error.message : 'unknown',
        );
      }
    });

    return NextResponse.json({ ok: true, orderNumber: order.number, subtotal: settledSubtotal, shipping: Number(order.shipping), discount: Number(order.discount), total: Number(order.total) });
  } catch (e: any) {
    if (uploadedProofPath) {
      try {
        await deletePaymentProof(uploadedProofPath);
      } catch (cleanupError) {
        console.error('CHECKOUT_PROOF_CLEANUP_ERROR:', cleanupError instanceof Error ? cleanupError.message : 'unknown');
      }
    }
    if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) && e.meta.target.includes('idempotencyKey')) {
      const replay = await prisma.order.findUnique({ where: { idempotencyKey }, select: { number: true, total: true, shipping: true, discount: true } });
      if (replay) return NextResponse.json({ ok: true, orderNumber: replay.number, total: Number(replay.total), shipping: Number(replay.shipping), discount: Number(replay.discount), replay: true });
    }
    if (e instanceof MultipartBodyLimitError) {
      return NextResponse.json({ error: 'حجم طلب الدفع يتجاوز الحد المسموح' }, { status: 413 });
    }
    if (e instanceof InvalidMultipartBodyError) {
      return NextResponse.json({ error: 'صيغة بيانات طلب الدفع غير صالحة' }, { status: 400 });
    }
    if (e instanceof CheckoutPriceChangedError) {
      return NextResponse.json({ error: e.message, actualTotal: e.actualTotal }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    if (e instanceof CheckoutDomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
    }
    if (e instanceof z.ZodError) {
      const expectedTotalMissing = e.issues.some((issue) => issue.path[0] === 'expectedTotal');
      const message = expectedTotalMissing
        ? 'تعذر التحقق من إجمالي الطلب. حدّثي الأسعار ثم أكّدي الطلب مرة أخرى.'
        : e.issues[0]?.message || 'بيانات الطلب غير صالحة';
      return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    if (e?.code === 'P2034') {
      return NextResponse.json({ error: 'حدث تعارض أثناء تحديث الطلب. راجعي ملخص الطلب ثم حاولي مجددًا.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('CHECKOUT_UNEXPECTED_ERROR:', {
      requestId,
      name: e instanceof Error ? e.name : 'unknown',
      code: typeof e?.code === 'string' ? e.code : undefined,
      message: e instanceof Error ? e.message : 'unknown',
    });
    return NextResponse.json({ error: 'تعذر إنشاء الطلب حاليًا. يرجى المحاولة لاحقًا.', requestId }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
