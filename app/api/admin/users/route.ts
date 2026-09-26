import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const u = await requireUser(['OWNER', 'ADMIN']);
    if (!u) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ في النظام' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(['OWNER', 'ADMIN']);
    if (!u) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const b = await req.json();
    if (!b.email || !b.password) {
      return NextResponse.json({ error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 });
    }

    if (b.role === 'OWNER' && u.role !== 'OWNER') {
      return NextResponse.json({ error: 'إنشاء مالك يتطلب OWNER' }, { status: 403 });
    }

    const hashedPassword = await hashPassword(b.password);
    const x = await prisma.user.create({
      data: {
        email: b.email.toLowerCase(),
        name: b.name || null,
        role: b.role || 'VIEWER',
        passwordHash: hashedPassword,
      },
    });

    return NextResponse.json({ id: x.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء الإنشاء' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const u = await requireUser(['OWNER', 'ADMIN']);
    if (!u) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const b = await req.json();
    const target = await prisma.user.findUnique({ where: { id: b.id } });
    
    if (!target) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (target.role === 'OWNER' && u.role !== 'OWNER') {
      return NextResponse.json({ error: 'لا يمكن تعديل OWNER' }, { status: 403 });
    }

    if (b.role === 'OWNER' && u.role !== 'OWNER') {
      return NextResponse.json({ error: 'صلاحية OWNER للمالك فقط' }, { status: 403 });
    }

    if (target.id === u.id && b.active === false) {
      return NextResponse.json({ error: 'لا يمكنك تعطيل حسابك الحالي' }, { status: 400 });
    }

    const x = await prisma.user.update({
      where: { id: b.id },
      data: {
        name: b.name,
        role: b.role,
        active: b.active,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: u.id,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: x.id,
        metadata: JSON.stringify({ role: b.role, active: b.active }),
      },
    });

    return NextResponse.json(x);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}
