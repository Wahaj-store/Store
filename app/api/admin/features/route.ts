// مسار الملف: app/api/admin/features/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

export async function GET() {
  try {
    const u = await requireUser();
    if (!u || (u.role !== 'OWNER' && u.role !== 'ADMIN' && !can(u.role, 'settingsWrite'))) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return NextResponse.json(features);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ في النظام' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
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
      data: { 
        userId: u.id, 
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
