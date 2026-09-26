import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 });
    }
    if (!can(user.role, 'securityRead')) {
      return NextResponse.json({ error: 'غير مصرح: سجل الأمان متاح للـ OWNER و ADMIN فقط.' }, { status: 403 });
    }

    const [logs, activeAdmins] = await Promise.all([
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { email: true, name: true, role: true } } },
      }),
      prisma.user.count({ where: { active: true } }),
    ]);

    return NextResponse.json({ logs, activeAdmins }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر جلب سجل الأمان.' }, { status: 500 });
  }
}
