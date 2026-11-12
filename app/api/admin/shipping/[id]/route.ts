import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { updateShippingZoneByIdSchema } from '@/lib/admin-shipping-schemas';
import {
  InvalidJsonBodyError,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from '@/lib/limited-json-body';

const MAX_SHIPPING_ADMIN_BODY_BYTES = 16 * 1024;

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission('shippingWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const { id } = await props.params;
    if (!id || id.length > 128) return NextResponse.json({ error: 'معرّف منطقة الشحن غير صالح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const raw = await readJsonBodyLimited(req, MAX_SHIPPING_ADMIN_BODY_BYTES);
    const parsed = updateShippingZoneByIdSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات منطقة الشحن غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const fields = parsed.data;
    const data = {
      ...(fields.price !== undefined ? { price: fields.price } : {}),
      ...(fields.freeAbove !== undefined ? { freeAbove: fields.freeAbove } : {}),
      ...(fields.active !== undefined ? { active: fields.active } : {}),
    };
    const zone = await prisma.shippingZone.update({ where: { id }, data });
    return NextResponse.json(zone, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'حجم الطلب أكبر من المسموح.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof Error && 'issues' in error) {
      const issues = (error as Error & { issues?: Array<{ message?: string }> }).issues;
      if (issues?.length) return NextResponse.json({ error: issues[0]?.message || 'بيانات منطقة الشحن غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'منطقة الشحن غير موجودة.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('ADMIN_SHIPPING_ZONE_UPDATE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر تحديث منطقة الشحن حاليًا.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission('shippingWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const { id } = await props.params;
    if (!id || id.length > 128) return NextResponse.json({ error: 'معرّف منطقة الشحن غير صالح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    await prisma.shippingZone.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'تم الحذف بنجاح' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'منطقة الشحن غير موجودة.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('ADMIN_SHIPPING_ZONE_DELETE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر حذف منطقة الشحن حاليًا.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
