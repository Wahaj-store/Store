import { NextResponse } from 'next/server';
import { PaymentMethod, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const paymentSettingsUpdateSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  enabled: z.boolean().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  iconKey: z.string().max(80).nullable().optional(),
  accountName: z.string().max(160).nullable().optional(),
  accountNumber: z.string().max(100).nullable().optional(),
  instructions: z.string().max(4000).nullable().optional(),
  proofRequired: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
}).refine(
  value => Object.keys(value).some(key => key !== 'method' && value[key as keyof typeof value] !== undefined),
  { message: 'يجب تحديد حقل واحد على الأقل للتحديث.' },
);

function unauthorized() {
  return NextResponse.json(
    { error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

function forbidden() {
  return NextResponse.json(
    { error: 'غير مصرح: إعدادات الدفع متاحة للـ OWNER و ADMIN فقط.' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    // Payment settings include payout/account details; do not expose them to
    // operational roles such as MANAGER, ORDER_MANAGER, EDITOR or VIEWER.
    if (!can(user.role, 'settingsRead')) return forbidden();

    const settings = await prisma.paymentSetting.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    console.error('ADMIN_PAYMENT_SETTINGS_READ_ERROR:', error);
    return NextResponse.json(
      { error: 'تعذر جلب إعدادات الدفع حاليًا.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'settingsWrite')) return forbidden();

    const body = paymentSettingsUpdateSchema.parse(await req.json());
    const { method, ...data } = body;
    const updated = await prisma.paymentSetting.update({
      where: { method },
      data,
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_PAYMENT',
        entity: 'PaymentSetting',
        entityId: updated.id,
        metadata: JSON.stringify({ method, changedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'بيانات إعدادات الدفع غير صالحة.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'طريقة الدفع المطلوبة غير موجودة.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('ADMIN_PAYMENT_SETTINGS_UPDATE_ERROR:', error);
    return NextResponse.json(
      { error: 'تعذر تحديث إعدادات الدفع حاليًا.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
