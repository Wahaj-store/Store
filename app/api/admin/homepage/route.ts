import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { revalidateHomepageData } from '@/lib/homepage-data';

function serializeConfig(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return JSON.stringify(value);
}

export async function GET() {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(await prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } }));
}

export async function POST(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const body = await req.json();
  const section = await prisma.homepageSection.create({
    data: {
      type: body.type,
      title: body.title || null,
      subtitle: body.subtitle || null,
      imageUrl: body.imageUrl || null,
      ctaText: body.ctaText || null,
      ctaUrl: body.ctaUrl || null,
      visible: body.visible !== false,
      sortOrder: Number(body.sortOrder || 0),
      config: serializeConfig(body.config),
    },
  });
  revalidateHomepageData();
  return NextResponse.json(section, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const body = await req.json();
  if (body.reorder) {
    await prisma.$transaction((body.items || []).map((item: { id: string }, index: number) =>
      prisma.homepageSection.update({ where: { id: item.id }, data: { sortOrder: index } }),
    ));
    revalidateHomepageData();
    return NextResponse.json({ ok: true });
  }
  const section = await prisma.homepageSection.update({
    where: { id: body.id },
    data: {
      type: body.type,
      title: body.title || null,
      subtitle: body.subtitle || null,
      imageUrl: body.imageUrl || null,
      ctaText: body.ctaText || null,
      ctaUrl: body.ctaUrl || null,
      visible: body.visible !== false,
      sortOrder: Number(body.sortOrder || 0),
      config: serializeConfig(body.config),
    },
  });
  revalidateHomepageData();
  return NextResponse.json(section);
}

export async function DELETE(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  await prisma.homepageSection.delete({ where: { id: (await req.json()).id } });
  revalidateHomepageData();
  return NextResponse.json({ ok: true });
}
