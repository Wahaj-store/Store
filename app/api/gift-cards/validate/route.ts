import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashGiftCardCode, giftCardIsUsable, normalizeGiftCardCode } from '@/lib/gift-card';
import { readJsonBodyLimited, RequestBodyTooLargeError } from '@/lib/limited-json-body';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { hashIdentifier } from '@/lib/security';

const Body = z.object({ code: z.string().trim().min(4).max(40) });
const MAX_BODY_BYTES = 2 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await readJsonBodyLimited(req, MAX_BODY_BYTES);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RequestBodyTooLargeError ? 'حجم الطلب أكبر من المسموح.' : 'بيانات الطلب غير صالحة.' },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const parsed = Body.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'كود بطاقة الهدايا غير صالح.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const code = normalizeGiftCardCode(parsed.data.code);
  const [ipLimit, codeLimit] = await Promise.all([
    rateLimit(`gift-card-validate:ip:${getClientKey(req)}`, RATE_LIMIT, RATE_WINDOW_MS, { requireDistributedStore: true }),
    rateLimit(`gift-card-validate:code:${hashIdentifier(code)}`, RATE_LIMIT, RATE_WINDOW_MS, { requireDistributedStore: true }),
  ]);
  if (!ipLimit.ok || !codeLimit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاولي مرة أخرى لاحقًا.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' } },
    );
  }

  try {
    const hash = hashGiftCardCode(code);
    const card = await prisma.giftCard.findFirst({
      where: { OR: [{ codeHash: hash }, { code }] },
      select: { id: true, code: true, balance: true, amount: true, active: true, expiresAt: true },
    });
    if (!card || !giftCardIsUsable(card)) {
      return NextResponse.json(
        { error: 'بطاقة الهدايا غير صالحة أو منتهية أو بدون رصيد.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { ok: true, balance: Number(card.balance), expiresAt: card.expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'تعذر التحقق من البطاقة حاليًا.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
