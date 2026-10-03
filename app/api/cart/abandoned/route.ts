import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomer } from '@/lib/customer-auth';
import { cartHash, AbandonedCartItem } from '@/lib/abandoned-cart';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!rawItems.length) {
      await prisma.abandonedCart.updateMany({
        where: {
          customerId: customer.id,
          status: { in: ['ACTIVE', 'ABANDONED'] },
        },
        data: { status: 'CLEARED' },
      });

      return NextResponse.json({ ok: true, status: 'CLEARED' });
    }

    const ids: string[] = [
      ...new Set<string>(
        rawItems
          .map((x: any) => String(x?.productId || ''))
          .filter(Boolean)
      ),
    ];

    if (!ids.length || ids.length > 100) {
      return NextResponse.json(
        { error: 'بيانات السلة غير صالحة' },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        status: 'PUBLISHED',
      },
      include: {
        images: true,
        variants: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const items: AbandonedCartItem[] = [];

    for (const raw of rawItems) {
      const product = productMap.get(String(raw.productId));
      if (!product) continue;

      const variant = raw.variantId
        ? product.variants.find((v) => v.id === String(raw.variantId))
        : null;

      const available = variant ? variant.stock : product.stock;

      const quantity = Math.min(
        Math.max(1, Number(raw.quantity) || 1),
        Math.min(available, 50)
      );

      if (quantity < 1) continue;

      items.push({
        productId: product.id,
        variantId: variant?.id,
        variantName: variant?.name,
        variantValue: variant?.value,
        name: product.name,
        price:
          variant?.price != null
            ? Number(variant.price)
            : Number(product.price),
        image:
          variant?.imageUrl ||
          product.images?.[0]?.url ||
          null,
        quantity,
      });
    }

    if (!items.length) {
      return NextResponse.json({ ok: true, status: 'CLEARED' });
    }

    const hash = cartHash(items);

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const itemCount = items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const existing = await prisma.abandonedCart.findUnique({
      where: { customerId: customer.id },
    });

    if (
      existing?.cartHash === hash &&
      existing.status !== 'RECOVERED' &&
      existing.status !== 'CLEARED'
    ) {
      await prisma.abandonedCart.update({
        where: { id: existing.id },
        data: {
          items,
          subtotal,
          itemCount,
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        status: existing.status,
      });
    }

    await prisma.abandonedCart.upsert({
      where: { customerId: customer.id },
      create: {
        customerId: customer.id,
        items,
        subtotal,
        itemCount,
        cartHash: hash,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
      },
      update: {
        items,
        subtotal,
        itemCount,
        cartHash: hash,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
        reminderSentAt: null,
        recoveredAt: null,
        orderId: null,
      },
    });

    return NextResponse.json({
      ok: true,
      status: 'ACTIVE',
    });
  } catch (error) {
    console.error('Abandoned cart sync failed:', error);

    return NextResponse.json(
      { error: 'تعذر حفظ السلة' },
      { status: 500 }
    );
  }
}
