import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomer } from '@/lib/customer-auth';
import { getCustomerSegmentKey } from '@/lib/customer-segment';
import { calculatePricing } from '@/lib/pricing';
import { giftCardIsUsable, hashGiftCardCode, normalizeGiftCardCode } from '@/lib/gift-card';
import { normalizePhone } from '@/lib/security';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

function normalizeNullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
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

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
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

    const ids: string[] = [
      ...new Set<string>(
        items
          .map((item: any) => String(item?.productId || ''))
          .filter(Boolean)
      ),
    ];
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      include: { variants: true },
    });

    const lines = items.map((item: any) => {
      const product = products.find(p => p.id === String(item.productId));
      if (!product) throw new Error('أحد المنتجات لم يعد متاحًا');

      const variant = item.variantId ? product.variants.find(v => v.id === String(item.variantId)) : undefined;
      if (product.variants.length > 0 && !variant) throw new Error(`اختاري خيارات المنتج ${product.name} أولاً`);

      const quantity = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 0)));
      if (!quantity) throw new Error('كمية منتج غير صالحة');

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
    const phone = normalizePhone(String(body?.phone || '').trim());
    const customer = loggedInCustomer?.id
      ? await prisma.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true, orders: { select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } })
      : phone
        ? await prisma.customer.findUnique({ where: { phone }, select: { id: true, orders: { select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } })
        : null;
    const customerOrders = customer?.orders.filter(o => o.status !== 'CANCELLED') ?? [];
    const customerSpend = customerOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const customerLastOrder = customerOrders.at(-1)?.createdAt ?? null;
    const isFirstOrder = customerOrders.length === 0;
    const customerSegmentKey = customer ? getCustomerSegmentKey({ orderCount: customerOrders.length, spend: customerSpend, lastOrder: customerLastOrder, now }) : null;


    let shippingPrice = 0;
    let shippingFreeAbove: number | null = null;
    const governorate = String(body?.governorate || '').trim();
    const city = String(body?.city || '').trim();
    if (governorate) {
      const zone = await prisma.shippingZone.findFirst({
        where: {
          governorate,
          active: true,
          OR: [{ city }, { city: null }],
        },
        orderBy: { city: 'desc' },
      });
      if (zone) {
        shippingPrice = Number(zone.price);
        shippingFreeAbove = normalizeNullableNumber(zone.freeAbove);
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
        giftCardAmount = Math.min(giftCardBalance, pricing.total);
      }
    }

    return NextResponse.json({
      ...pricing,
      total: Math.max(0, pricing.total - giftCardAmount),
      giftCardBalance,
      giftCardAmount,
      giftCardError,
      isFirstOrder,
      appliedOffers: pricing.appliedOffers,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'تعذر تحديث ملخص الطلب',
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      freeShipping: false,
      appliedOffers: [],
    }, { status: 400 });
  }
}
