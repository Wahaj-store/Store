import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomer } from '@/lib/customer-auth';
import { getCustomerSegmentKey } from '@/lib/customer-segment';
import { findActiveShippingZone, resolveShippingFreeAbove } from '@/lib/shipping';
import { calculatePricing } from '@/lib/pricing';
import { giftCardIsUsable, hashGiftCardCode, normalizeGiftCardCode } from '@/lib/gift-card';
import { normalizePhone } from '@/lib/security';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { CheckoutPreviewSchema } from '@/lib/checkout-preview-schema';
import { getCustomerOrderMetrics } from '@/lib/customer-order-metrics';
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyLimited,
} from '@/lib/limited-json-body';

const PREVIEW_MAX_BODY_BYTES = 64 * 1024;

function previewErrorResponse(error: string, status = 400) {
  return NextResponse.json(
    { error, subtotal: 0, discount: 0, shipping: 0, total: 0, freeShipping: false, appliedOffers: [] },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(`checkout-preview:${getClientKey(req)}`, 30, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد محاولات تحديث السلة. يرجى المحاولة مرة أخرى بعد قليل.' },
        { status: 429, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } },
      );
    }

    const rawBody = await readJsonBodyLimited(req, PREVIEW_MAX_BODY_BYTES);
    const parsedBody = CheckoutPreviewSchema.safeParse(rawBody);
    if (!parsedBody.success) return previewErrorResponse('بيانات السلة غير صالحة.');

    const body = parsedBody.data;
    const items = body.items;
    if (!items.length) {
      return NextResponse.json({
        subtotal: 0,
        discount: 0,
        shipping: 0,
        total: 0,
        freeShipping: false,
        appliedOffers: [],
      });
    }

    const ids = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: {
        id: true,
        name: true,
        price: true,
        categoryId: true,
        variants: { select: { id: true, price: true } },
      },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const lines = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new Error('أحد المنتجات لم يعد متاحًا');

      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : undefined;
      if (product.variants.length > 0 && !variant) throw new Error(`اختاري خيارات المنتج ${product.name} أولاً`);

      const quantity = item.quantity;
      const unitPrice = variant?.price != null ? Number(variant.price) : Number(product.price);
      return {
        quantity,
        unitPrice,
        productId: product.id,
        categoryId: product.categoryId,
      };
    });

    const now = new Date();
    const loggedInCustomer = await getCustomer();
    const phone = normalizePhone(body.phone);
    const customer = loggedInCustomer?.id
      ? await prisma.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true } })
      : phone
        ? await prisma.customer.findUnique({ where: { phone }, select: { id: true } })
        : null;
    const customerMetrics = customer
      ? await getCustomerOrderMetrics(customer.id)
      : { orderCount: 0, spend: 0, lastOrder: null };
    const isFirstOrder = customerMetrics.orderCount === 0;
    const customerSegmentKey = customer
      ? getCustomerSegmentKey({ ...customerMetrics, now })
      : null;


    let shippingPrice = 0;
    let shippingFreeAbove: number | null = null;
    const governorate = String(body?.governorate || '').trim();
    const city = String(body?.city || '').trim();
    if (governorate) {
      const zone = await findActiveShippingZone(governorate, city);
      if (zone) {
        shippingPrice = Number(zone.price);
        shippingFreeAbove = await resolveShippingFreeAbove(zone);
      }
    }

    const activeOffers = await prisma.offer.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
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

    const pricing = calculatePricing({
      lines,
      shippingPrice,
      shippingFreeAbove,
      offers: activeOffers.map(o => ({
        ...o,
        segmentKeys: (o.segmentTargets || []).map((target: any) => target.segmentKey),
        discountValue: o.discountValue === null ? null : Number(o.discountValue),
        minOrder: o.minOrder === null ? null : Number(o.minOrder),
        maxDiscount: o.maxDiscount === null ? null : Number(o.maxDiscount),
        buyQuantity: o.buyQuantity === null ? null : Number(o.buyQuantity),
        getQuantity: o.getQuantity === null ? null : Number(o.getQuantity),
        getDiscountPercent: o.getDiscountPercent === null ? null : Number(o.getDiscountPercent),
      })),
      isFirstOrder,
      customerSegmentKey,
      now,
    });

    const giftWrapFlag = await prisma.featureFlag.findUnique({ where: { key: 'gift_wrap' }, select: { enabled: true } });
    const giftWrapSelected = body?.giftWrap === true && giftWrapFlag?.enabled === true;
    const giftWrapSetting = giftWrapSelected ? await prisma.siteSetting.findUnique({ where: { key: 'gift_wrap_fee' }, select: { value: true } }) : null;
    const parsedGiftWrapFee = Number(giftWrapSetting?.value || 0);
    const giftWrapFee = giftWrapSelected && Number.isFinite(parsedGiftWrapFee) ? Math.max(0, Math.min(100000, parsedGiftWrapFee)) : 0;
    const previewTotal = pricing.total + giftWrapFee;

    const giftCardCode = String(body?.giftCardCode || '').trim();
    let giftCardBalance: number | null = null;
    let giftCardAmount = 0;
    let giftCardError = '';
    if (giftCardCode) {
      const normalized = normalizeGiftCardCode(giftCardCode);
      const card = await prisma.giftCard.findFirst({ where: { OR: [{ codeHash: hashGiftCardCode(normalized) }, { code: normalized }] }, select: { active: true, expiresAt: true, balance: true } });
      if (!card || !giftCardIsUsable(card)) {
        giftCardError = 'بطاقة الهدايا غير صالحة أو منتهية أو بدون رصيد';
      } else {
        giftCardBalance = Number(card.balance);
        giftCardAmount = Math.min(giftCardBalance, previewTotal);
      }
    }

    return NextResponse.json({
      ...pricing,
      giftWrapFee,
      total: Math.max(0, previewTotal - giftCardAmount),
      giftCardBalance,
      giftCardAmount,
      giftCardError,
      isFirstOrder,
      appliedOffers: pricing.appliedOffers,
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return previewErrorResponse('حجم بيانات معاينة السلة أكبر من الحد المسموح.', 413);
    }
    if (error instanceof InvalidJsonBodyError) {
      return previewErrorResponse('تعذر قراءة بيانات السلة.');
    }
    return previewErrorResponse(
      error instanceof Error ? error.message : 'تعذر تحديث ملخص الطلب',
    );
  }
}
