import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { recordInventoryEntry } from '@/lib/inventory';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('productsRead');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  const p = await prisma.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true, reviews: { include: { customer: { select: { id: true, name: true, phone: true, email: true } } }, orderBy: { createdAt: 'desc' } } } });
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('productsWrite');
  if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
  try {
    const b = await req.json();
    const newStock = Number(b.stock || 0);
    const newVariants: Array<{ name: string; value: string; stock: number; price: number | null; sku: string | null; imageUrl: string | null }> = (b.variants || [])
      .filter((x: any) => x.name && x.value)
      .map((x: any) => ({
        name: String(x.name),
        value: String(x.value),
        stock: Number(x.stock || 0),
        price: x.price === '' || x.price == null ? null : Number(x.price),
        sku: x.sku || null,
        imageUrl: x.imageUrl || null,
      }));
    if (!Number.isInteger(newStock) || newStock < 0 || newVariants.some((x: any) => !Number.isInteger(x.stock) || x.stock < 0)) return NextResponse.json({ error: 'قيم المخزون غير صالحة' }, { status: 400 });

    const p = await prisma.$transaction(async tx => {
      const old = await tx.product.findUnique({ where: { id: params.id }, include: { variants: true } });
      if (!old) throw new Error('المنتج غير موجود');

      const oldByKey = new Map(old.variants.map(v => [`${v.name}::${v.value}`, v]));
      const newByKey = new Map(newVariants.map(v => [`${v.name}::${v.value}`, v]));

      for (const oldVariant of old.variants) {
        const next = newByKey.get(`${oldVariant.name}::${oldVariant.value}`);
        if (!next && oldVariant.stock > 0) {
          await recordInventoryEntry(tx, { productId: old.id, variantId: oldVariant.id, userId: auth.user!.id, type: 'ADJUSTMENT', quantity: -oldVariant.stock, balanceAfter: 0, productNameSnapshot: old.name, variantNameSnapshot: oldVariant.name, variantValueSnapshot: oldVariant.value, skuSnapshot: oldVariant.sku || old.sku, reason: 'إزالة خيار من المنتج', reference: 'PRODUCT_UPDATE' });
        }
      }

      await tx.productImage.deleteMany({ where: { productId: params.id } });
      await tx.productVariant.deleteMany({ where: { productId: params.id } });
      const updated = await tx.product.update({ where: { id: params.id }, data: {
        name: b.name, slug: b.slug, description: b.description || null, price: Number(b.price), comparePrice: b.comparePrice === '' || b.comparePrice == null ? null : Number(b.comparePrice), stock: newStock,
        sku: b.sku, categoryId: b.categoryId, status: b.status, material: b.material || null, careInstructions: b.careInstructions || null, seoTitle: b.seoTitle || null,
        seoDescription: b.seoDescription || null, tags: b.tags || null, videoUrl: b.videoUrl || null, barcode: b.barcode || null, weight: b.weight === '' || b.weight == null ? null : Number(b.weight),
        featured: Boolean(b.featured), newArrival: Boolean(b.newArrival), bestSeller: Boolean(b.bestSeller),
        images: { create: (b.images || []).map((x: any, i: number) => ({ url: x.url, alt: x.alt || b.name, sortOrder: i })) },
        variants: { create: newVariants },
      } });

      const productDelta = newStock - old.stock;
      if (productDelta !== 0) await recordInventoryEntry(tx, { productId: updated.id, userId: auth.user!.id, type: productDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT', quantity: productDelta, balanceAfter: newStock, productNameSnapshot: updated.name, skuSnapshot: updated.sku, reason: 'تعديل مخزون المنتج من الإدارة', reference: 'PRODUCT_UPDATE' });

      const currentVariants = await tx.productVariant.findMany({ where: { productId: updated.id } });
      for (const current of currentVariants) {
        const oldVariant = oldByKey.get(`${current.name}::${current.value}`);
        const delta = current.stock - (oldVariant?.stock || 0);
        if (delta !== 0) await recordInventoryEntry(tx, { productId: updated.id, variantId: current.id, userId: auth.user!.id, type: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', quantity: delta, balanceAfter: current.stock, productNameSnapshot: updated.name, variantNameSnapshot: current.name, variantValueSnapshot: current.value, skuSnapshot: current.sku || updated.sku, reason: oldVariant ? 'تعديل مخزون الخيار من الإدارة' : 'إضافة خيار جديد بمخزون', reference: 'PRODUCT_UPDATE' });
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });

    await prisma.activityLog.create({ data: { userId: auth.user.id, action: 'UPDATE', entity: 'Product', entityId: p.id, metadata: JSON.stringify({ inventoryTracked: true }) } });
    return NextResponse.json(p);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'تعذر تحديث المنتج' }, { status: e?.code === 'P2034' ? 409 : 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('productsWrite');
  if (!auth.user || !['OWNER', 'ADMIN', 'MANAGER'].includes(auth.user.role)) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.user ? 403 : 401 });
  const refs = await prisma.orderItem.count({ where: { productId: params.id } });
  if (refs > 0) return NextResponse.json({ error: 'لا يمكن حذف منتج مرتبط بطلبات. غيّري حالته إلى ARCHIVED بدلًا من الحذف.' }, { status: 409 });
  const reviewRefs = await prisma.review.count({ where: { productId: params.id } });
  if (reviewRefs > 0) return NextResponse.json({ error: 'لا يمكن حذف منتج له تقييمات. غيّري حالته إلى ARCHIVED بدلًا من الحذف.' }, { status: 409 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
