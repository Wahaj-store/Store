import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { hashIdentifier, normalizePhone } from '@/lib/security';

const GENERIC_NOT_FOUND_MESSAGE = 'عذراً، لم يتم العثور على طلب بهذه البيانات. تأكد من البيانات واطلب المساعدة.';

function cleanOrderNumber(value: unknown) {
  return String(value || '').trim().replace(/^#+/, '').toUpperCase();
}

function cleanPhone(value: unknown) {
  const normalized = normalizePhone(String(value || ''));
  return normalized.length >= 10 ? normalized : '';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderNumber = cleanOrderNumber(body.orderNumber);
    const phone = cleanPhone(body.phone);

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم الطلب ورقم الهاتف المسجل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Track Order is intentionally public, so protect it against enumeration.
    const clientKey = getClientKey(req);
    const ipLimit = rateLimit(`track-order:ip:${clientKey}`, 5, 10 * 60 * 1000);
    const credentialLimit = rateLimit(
      `track-order:credential:${hashIdentifier(`${orderNumber}:${phone}`)}`,
      5,
      10 * 60 * 1000,
    );

    if (!ipLimit.ok || !credentialLimit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد محاولات التتبع. يرجى المحاولة مرة أخرى بعد قليل.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '600',
          },
        },
      );
    }

    // The order number is unique. Query it exactly, then verify the phone after
    // normalizing both sides. This prevents partial-number matching/enumeration.
    const order = await prisma.order.findUnique({
      where: { number: orderNumber },
      select: {
        number: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        shippingProvider: true,
        trackingNumber: true,
        shippingGovernorate: true,
        shippingCity: true,
        shippingAddress: true,
        customerPhoneSnapshot: true,
        customer: { select: { phone: true } },
        items: {
          select: {
            id: true,
            name: true,
            variantName: true,
            quantity: true,
            price: true,
          },
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: GENERIC_NOT_FOUND_MESSAGE },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const storedPhones = [order.customerPhoneSnapshot, order.customer?.phone]
      .filter((value): value is string => Boolean(value))
      .map(normalizePhone);

    if (!storedPhones.includes(phone)) {
      return NextResponse.json(
        { error: GENERIC_NOT_FOUND_MESSAGE },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Do not expose customer records, internal notes, payment references,
    // product internals, or other administrative fields through this public API.
    const { customerPhoneSnapshot: _customerPhoneSnapshot, customer: _customer, ...publicOrder } = order;

    return NextResponse.json(publicOrder, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Track Order Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء البحث عن الطلب' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
