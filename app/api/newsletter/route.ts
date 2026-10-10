import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { hashIdentifier } from '@/lib/security';

const NewsletterSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(254).transform(value => value.toLowerCase()),
  source: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  const clientKey = getClientKey(req);
  const limit = await rateLimit(`newsletter:ip:${clientKey}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاولي مرة أخرى لاحقًا.' },
      { status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' } },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'بيانات الاشتراك غير صالحة.' }, { status: 400 });
  }

  const parsed = NewsletterSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'البريد الإلكتروني غير صالح.' }, { status: 400 });
  }

  const emailLimit = await rateLimit(`newsletter:email:${hashIdentifier(parsed.data.email)}`, 2, 60 * 60 * 1000);
  if (!emailLimit.ok) {
    return NextResponse.json({ ok: true, message: 'تم تسجيل الاشتراك مسبقًا.' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, source: parsed.data.source },
      update: { active: true },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'تعذّر حفظ الاشتراك الآن. حاولي مرة أخرى لاحقًا.' }, { status: 500 });
  }
}
