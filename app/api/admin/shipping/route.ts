import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import {
  createShippingZoneSchema,
  updateShippingZoneSchema,
} from '@/lib/admin-shipping-schemas';
import {
  InvalidJsonBodyError,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from '@/lib/limited-json-body';

const MAX_SHIPPING_ADMIN_BODY_BYTES = 16 * 1024;

const egyptianGovernorates = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية',
  'المنوفية', 'القليوبية', 'الغربية', 'البحيرة', 'كفر الشيخ',
  'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم',
  'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'أسوان', 'الأقصر', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
  'شمال سيناء', 'جنوب سيناء',
];

function responseError(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) {
    return NextResponse.json({ error: 'حجم الطلب أكبر من المسموح.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
  }
  if (error instanceof InvalidJsonBodyError) {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ error: 'تعذر تنفيذ العملية حاليًا.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}

// Ensure base governorate zones exist without deleting city-specific overrides.
async function ensureGovernoratesExist() {
  try {
    for (const governorate of egyptianGovernorates) {
      const existing = await prisma.shippingZone.findFirst({ where: { governorate, city: null } });
      if (!existing) {
        await prisma.shippingZone.create({ data: { governorate, price: 60, active: true } });
      }
    }
  } catch (error) {
    console.error('SHIPPING_GOVERNORATE_SEED_ERROR:', error instanceof Error ? error.message : 'unknown');
  }
}

export async function GET() {
  try {
    const auth = await requirePermission('shippingRead');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    await ensureGovernoratesExist();
    const zones = await prisma.shippingZone.findMany({ where: { city: null }, orderBy: { governorate: 'asc' } });
    return NextResponse.json(zones, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'تعذر جلب مناطق الشحن.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requirePermission('shippingWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const raw = await readJsonBodyLimited(req, MAX_SHIPPING_ADMIN_BODY_BYTES);
    const parsed = createShippingZoneSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات منطقة الشحن غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const { governorate, price, freeAbove } = parsed.data;

    const existing = await prisma.shippingZone.findFirst({ where: { governorate } });
    if (existing) return NextResponse.json({ error: 'منطقة المحافظة موجودة بالفعل.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });

    const zone = await prisma.shippingZone.create({
      data: { governorate, price, ...(freeAbove !== undefined ? { freeAbove } : {}), active: true },
    });
    return NextResponse.json(zone, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError || error instanceof InvalidJsonBodyError) return responseError(error);
    console.error('ADMIN_SHIPPING_ZONE_CREATE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return responseError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requirePermission('shippingWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const raw = await readJsonBodyLimited(req, MAX_SHIPPING_ADMIN_BODY_BYTES);
    const parsed = updateShippingZoneSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات منطقة الشحن غير صالحة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const { id, ...fields } = parsed.data;
    const data = {
      ...(fields.price !== undefined ? { price: fields.price } : {}),
      ...(fields.freeAbove !== undefined ? { freeAbove: fields.freeAbove } : {}),
      ...(fields.active !== undefined ? { active: fields.active } : {}),
    };
    const zone = await prisma.shippingZone.update({ where: { id }, data });
    return NextResponse.json(zone, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError || error instanceof InvalidJsonBodyError) return responseError(error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'منطقة الشحن غير موجودة.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('ADMIN_SHIPPING_ZONE_UPDATE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return responseError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requirePermission('shippingWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const id = new URL(req.url).searchParams.get('id');
    if (!id || id.length > 128) return NextResponse.json({ error: 'معرّف منطقة الشحن غير صالح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    await prisma.shippingZone.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'منطقة الشحن غير موجودة.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('ADMIN_SHIPPING_ZONE_DELETE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر حذف منطقة الشحن.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
