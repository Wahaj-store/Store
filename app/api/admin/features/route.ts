// مسار الملف: app/api/admin/features/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission as requireApiPermission } from '@/lib/auth';

export async function GET() {
  try {
    const authorization = await requireApiPermission('settingsRead');
    if (!authorization.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: authorization.status });
    }
    const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return NextResponse.json(features);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ في النظام' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authorization = await requireApiPermission('settingsWrite');
    if (!authorization.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: authorization.status });
    }
    
    const b = await req.json();
    const x = await prisma.featureFlag.update({
      where: { key: b.key },
      data: { enabled: Boolean(b.enabled) }
    });
    
    await prisma.activityLog.create({
      data: { 
        userId: authorization.user.id,
        action: 'UPDATE_FEATURE', 
        entity: 'FeatureFlag', 
        entityId: x.id 
      }
    });
    
    return NextResponse.json(x);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}
