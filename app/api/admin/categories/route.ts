import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { revalidateShopCategories } from '@/lib/shop-cache';

export async function GET() {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }));
}

export async function POST(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const body = await req.json();
  if (!body.name || !body.slug) return NextResponse.json({ error: 'الاسم والرابط مطلوبان' }, { status: 400 });
  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      sortOrder: Number(body.sortOrder || 0),
    },
  });
  revalidateShopCategories();
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const body = await req.json();
  const category = await prisma.category.update({
    where: { id: body.id },
    data: {
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      sortOrder: Number(body.sortOrder || 0),
      active: body.active !== false,
    },
  });
  revalidateShopCategories();
  return NextResponse.json(category);
}

export async function DELETE(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const { id } = await req.json();
  const references = await prisma.product.count({ where: { categoryId: id } });
  if (references > 0) {
    return NextResponse.json(
      { error: 'لا يمكن حذف تصنيف يحتوي على منتجات. انقلي المنتجات أو عطّلي التصنيف أولًا.' },
      { status: 409 },
    );
  }
  const category = await prisma.category.delete({ where: { id } });
  revalidateShopCategories();
  return NextResponse.json(category);
}
