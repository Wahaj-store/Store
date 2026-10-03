import { NextResponse } from 'next/server';
import { DiscountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCustomer } from '@/lib/customer-auth';
import { calculatePricing } from '@/lib/pricing';

function normalizeNullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

export async function POST(req: Request) {
  try {
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
    const phone = String(body?.phone || '').trim();
    const customer = loggedInCustomer?.id
      ? await prisma.customer.findUnique({ where: { id: loggedInCustomer.id }, select: { id: true, _count: { select: { orders: true } } } })
      : phone
        ? await prisma.customer.findUnique({ where: { phone }, select: { id: true, _count: { select: { orders: true } } } })
        : null;
    const isFirstOrder = !customer || customer._count.orders === 0;

    let coupon: { code: string; type: DiscountType; value: number; minOrder: number | null } | undefined;
    let couponError: string | undefined;
    const couponCode = String(body?.couponCode || '').trim().toUpperCase();
    if (couponCode) {
      const found = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!found || !found.active || (found.startsAt && found.startsAt > now) || (found.expiresAt && found.expiresAt < now) || (found.maxUses !== null && found.usedCount >= found.maxUses)) {
        couponError = 'الكوبون غير صالح أو انتهت صلاحيته';
      } else {
        coupon = {
          code: found.code,
          type: found.type,
          value: Number(found.value),
          minOrder: normalizeNullableNumber(found.minOrder),
        };
      }
    }

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
      },
    });

    const pricing = calculatePricing({
      lines,
      shippingPrice,
      shippingFreeAbove,
      coupon,
      offers: activeOffers.map(o => ({
        ...o,
        discountValue: o.discountValue === null ? null : Number(o.discountValue),
        minOrder: o.minOrder === null ? null : Number(o.minOrder),
        maxDiscount: o.maxDiscount === null ? null : Number(o.maxDiscount),
        buyQuantity: o.buyQuantity === null ? null : Number(o.buyQuantity),
        getQuantity: o.getQuantity === null ? null : Number(o.getQuantity),
        getDiscountPercent: o.getDiscountPercent === null ? null : Number(o.getDiscountPercent),
      })),
      isFirstOrder,
      now,
    });

    if (coupon && coupon.minOrder !== null && pricing.subtotal < coupon.minOrder) {
      couponError = `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrder.toLocaleString('ar-EG')} ج.م`;
    }

    return NextResponse.json({
      ...pricing,
      isFirstOrder,
      couponError,
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
