import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { isPrivatePaymentProofPath } from '@/lib/payment-proof';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER'];
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(ALLOWED_ROLES);
  if (!user) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
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
          'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    );
  }

  const privateBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!privateBlobToken) {
    return NextResponse.json(
      { error: 'تخزين إثباتات الدفع غير مهيأ.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { id } = await params;
    const payment = await prisma.payment.findFirst({
      where: { orderId: id, proofUrl: { not: null } },
      select: { proofUrl: true },
    });

    if (!payment?.proofUrl || !isPrivatePaymentProofPath(payment.proofUrl)) {
      return NextResponse.json(
        { error: 'إثبات الدفع غير موجود في التخزين الخاص.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // المسار يأتي من قاعدة البيانات؛ لا يُقبل pathname أو URL من العميل.
    const blob = await get(payment.proofUrl, {
      access: 'private',
      token: privateBlobToken,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json(
        { error: 'تعذر قراءة إثبات الدفع.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const contentType = ALLOWED_IMAGE_TYPES.has(blob.blob.contentType || '')
      ? blob.blob.contentType!
      : 'application/octet-stream';
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; sandbox",
    });
    if (blob.blob.size > 0) headers.set('Content-Length', String(blob.blob.size));

    return new NextResponse(blob.stream, { status: 200, headers });
  } catch (error) {
    console.error(
      'PAYMENT_PROOF_READ_ERROR:',
      error instanceof Error ? error.message : 'unknown',
    );

    return NextResponse.json(
      { error: 'تعذر عرض إثبات الدفع حاليًا.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
