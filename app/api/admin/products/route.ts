import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { recordInventoryEntry } from '@/lib/inventory';

export async function GET() {
  const auth = await requirePermission('productsRead');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  return NextResponse.json(await prisma.product.findMany({ include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: Request) {
  const auth = await requirePermission('productsWrite');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  try {
    const b = await req.json();
    const stock = Number(b.stock || 0);
    const variants = (b.variants || []).filter((x: any) => x.name && x.value).map((x: any) => ({ name: x.name, value: x.value, stock: Number(x.stock || 0), price: x.price === '' || x.price == null ? null : Number(x.price), sku: x.sku || null, imageUrl: x.imageUrl || null }));
    if (!Number.isInteger(stock) || stock < 0 || variants.some((x: any) => !Number.isInteger(x.stock) || x.stock < 0)) return NextResponse.json({ error: 'قيم المخزون غير صالحة' }, { status: 400 });

    const p = await prisma.$transaction(async tx => {
      const created = await tx.product.create({ data: {
        name: b.name, slug: b.slug, description: b.description || null, price: Number(b.price), comparePrice: b.comparePrice === '' || b.comparePrice == null ? null : Number(b.comparePrice), stock,
        sku: b.sku, categoryId: b.categoryId, status: b.status || 'DRAFT', material: b.material || null, careInstructions: b.careInstructions || null,
        seoTitle: b.seoTitle || null, seoDescription: b.seoDescription || null, tags: b.tags || null, videoUrl: b.videoUrl || null, barcode: b.barcode || null,
        weight: b.weight === '' || b.weight == null ? null : Number(b.weight), featured: Boolean(b.featured), newArrival: Boolean(b.newArrival), bestSeller: Boolean(b.bestSeller),
        images: { create: (b.images || []).map((x: any, i: number) => ({ url: x.url, alt: x.alt || b.name, sortOrder: i })) },
        variants: { create: variants },
      }});
      if (stock > 0) await recordInventoryEntry(tx, { productId: created.id, userId: auth.user!.id, type: 'OPENING', quantity: stock, balanceAfter: stock, productNameSnapshot: created.name, skuSnapshot: created.sku, reason: 'الرصيد الافتتاحي عند إنشاء المنتج', reference: 'PRODUCT_CREATE' });
      const createdVariants = await tx.productVariant.findMany({ where: { productId: created.id }, select: { id: true, name: true, value: true, stock: true, sku: true } });
      for (const v of createdVariants) if (v.stock > 0) await recordInventoryEntry(tx, { productId: created.id, variantId: v.id, userId: auth.user!.id, type: 'OPENING', quantity: v.stock, balanceAfter: v.stock, productNameSnapshot: created.name, variantNameSnapshot: v.name, variantValueSnapshot: v.value, skuSnapshot: v.sku || created.sku, reason: 'الرصيد الافتتاحي للخيار عند إنشاء المنتج', reference: 'PRODUCT_CREATE' });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    await prisma.activityLog.create({ data: { userId: auth.user.id, action: 'CREATE', entity: 'Product', entityId: p.id } });
    return NextResponse.json(p, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'تعذر إنشاء المنتج' }, { status: e?.code === 'P2034' ? 409 : 400 });
  }
}
