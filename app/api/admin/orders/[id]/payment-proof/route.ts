import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { isPrivatePaymentProofPath } from '@/lib/payment-proof';

const ALLOWED_ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'ORDER_MANAGER',
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(ALLOWED_ROLES);

  if (!user) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 403 },
    );
  }

  const limit = await rateLimit(
    `payment-proof:${user.id}:${getClientKey(req)}`,
    30,
    10 * 60 * 1000,
  );

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقًا.' },
      {
        status: 429,
        headers: {
          'Retry-After': '600',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  try {
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: {
        orderId: id,
        proofUrl: {
          not: null,
        },
      },
      select: {
        proofUrl: true,
        method: true,
        orderId: true,
      },
    });

    if (!payment?.proofUrl) {
      return NextResponse.json(
        { error: 'إثبات الدفع غير موجود' },
        { status: 404 },
      );
    }

    const pathname = payment.proofUrl;

    // لا تسمح بقراءة أي مسار خارج مجلد إثباتات الدفع.
    if (!isPrivatePaymentProofPath(pathname)) {
      return NextResponse.json(
        { error: 'إثبات الدفع غير متاح في التخزين الخاص' },
        { status: 404 },
      );
    }

    const blob = await get(pathname, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json(
        { error: 'تعذر قراءة إثبات الدفع' },
        { status: 404 },
      );
    }

    return new NextResponse(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': blob.blob.contentType || 'application/octet-stream',
        'Content-Length': String(blob.blob.size || ''),
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:;",
        ETag: blob.blob.etag,
      },
    });
  } catch (error) {
    console.error('PAYMENT_PROOF_READ_ERROR:', error);

    return NextResponse.json(
      { error: 'تعذر عرض إثبات الدفع حاليًا' },
      { status: 500 },
    );
  }
}
