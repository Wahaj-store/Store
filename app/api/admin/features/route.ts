import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

export async function GET() {
  const u = await requireUser();
  // السماح مباشرة للـ OWNER والـ ADMIN أو من يمتلك الصلاحية
  if (!u || (u.role !== 'OWNER' && u.role !== 'ADMIN' && !can(u.role, 'settingsWrite'))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  return NextResponse.json(await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }));
}

export async function PUT(req: Request) {
  const u = await requireUser();
  if (!u || (u.role !== 'OWNER' && u.role !== 'ADMIN' && !can(u.role, 'settingsWrite'))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const b = await req.json();
  const x = await prisma.featureFlag.update({
    where: { key: b.key },
    data: { enabled: Boolean(b.enabled) }
  });
  await prisma.activityLog.create({
    data: { userId: u.id, action: 'UPDATE_FEATURE', entity: 'FeatureFlag', entityId: x.id }
  });
  return NextResponse.json(x);
}
