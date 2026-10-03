import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const ALLOWED = new Set(['vip', 'loyal', 'highValue', 'new', 'atRisk', 'dormant', 'noPurchase']);

export async function GET() {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const rows = await prisma.offerSegmentTarget.findMany({
    select: { offerId: true, segmentKey: true },
  });
  const targets: Record<string, string[]> = {};
  for (const row of rows) (targets[row.offerId] ||= []).push(row.segmentKey);
  return NextResponse.json({ targets });
}

export async function PUT(req: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const body = await req.json();
  const offerId = String(body?.offerId || '');
  const segmentKeys = Array.isArray(body?.segmentKeys)
    ? [...new Set(body.segmentKeys.map((x: unknown) => String(x)).filter((x: string) => ALLOWED.has(x)))]
    : [];
  if (!offerId) return NextResponse.json({ error: 'العرض مطلوب' }, { status: 400 });

  await prisma.offer.findUniqueOrThrow({ where: { id: offerId }, select: { id: true } });
  await prisma.$transaction(async tx => {
    await tx.offerSegmentTarget.deleteMany({
  where: { offerId },
});

if (segmentKeys.length) {
  await tx.offerSegmentTarget.createMany({
    data: segmentKeys.map((segmentKey: string) => ({
      offerId,
      segmentKey,
    })),
  });
}

return NextResponse.json({ ok: true, offerId, segmentKeys });
