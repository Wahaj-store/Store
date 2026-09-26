import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, hashPassword } from '@/lib/auth';
import { can } from '@/lib/rbac';

const roleSchema = z.nativeEnum(Role);
const createSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().max(120).optional().nullable(),
  role: roleSchema.default(Role.VIEWER),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().max(120).optional().nullable(),
  role: roleSchema,
  active: z.boolean(),
});

function unauthorized() {
  return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'غير مصرح: إدارة المستخدمين والصلاحيات متاحة للـ OWNER و ADMIN فقط.' }, { status: 403 });
}

function safeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'usersRead')) return forbidden();

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

    return NextResponse.json(users, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'حدث خطأ في النظام.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'usersWrite')) return forbidden();

    const body = createSchema.parse(await req.json());
    if (body.role === Role.OWNER && user.role !== Role.OWNER) {
      return NextResponse.json({ error: 'إنشاء مستخدم بصلاحية OWNER يتطلب OWNER.' }, { status: 403 });
    }

    const passwordHash = await hashPassword(body.password);
    const created = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name || null,
        role: body.role,
        passwordHash,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: created.id,
        metadata: JSON.stringify({ role: created.role }),
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'حدث خطأ أثناء الإنشاء.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2002' ? 409 : 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'usersWrite')) return forbidden();

    const body = updateSchema.parse(await req.json());
    const target = await prisma.user.findUnique({ where: { id: body.id } });
    if (!target) return NextResponse.json({ error: 'المستخدم غير موجود.' }, { status: 404 });

    if (target.role === Role.OWNER && user.role !== Role.OWNER) {
      return NextResponse.json({ error: 'لا يمكن تعديل حساب OWNER إلا بواسطة OWNER.' }, { status: 403 });
    }

    if (body.role === Role.OWNER && user.role !== Role.OWNER) {
      return NextResponse.json({ error: 'منح صلاحية OWNER متاح للـ OWNER فقط.' }, { status: 403 });
    }

    if (target.id === user.id && body.active === false) {
      return NextResponse.json({ error: 'لا يمكنك تعطيل حسابك الحالي.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: body.id },
      data: {
        name: body.name ?? null,
        role: body.role,
        active: body.active,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: updated.id,
        metadata: JSON.stringify({ role: updated.role, active: updated.active }),
      },
    });

    return NextResponse.json(safeUser(updated));
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'حدث خطأ أثناء التحديث.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2025' ? 404 : 400 });
  }
}
