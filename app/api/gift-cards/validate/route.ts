import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashGiftCardCode, giftCardIsUsable, normalizeGiftCardCode } from '@/lib/gift-card';

const Body = z.object({ code: z.string().trim().min(4).max(40) });

export async function POST(req: Request) {
  try {
    const { code: rawCode } = Body.parse(await req.json());
    const code = normalizeGiftCardCode(rawCode);
    const hash = hashGiftCardCode(code);
    const card = await prisma.giftCard.findFirst({
      where: { OR: [{ codeHash: hash }, { code }] },
      select: { id: true, code: true, balance: true, amount: true, active: true, expiresAt: true },
    });
    if (!card || !giftCardIsUsable(card)) return NextResponse.json({ error: 'بطاقة الهدايا غير صالحة أو منتهية أو بدون رصيد.' }, { status: 400 });
    return NextResponse.json({ ok: true, balance: Number(card.balance), expiresAt: card.expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || 'كود بطاقة الهدايا غير صالح.' }, { status: 400 });
  }
}
