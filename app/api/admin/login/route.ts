import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword } from '@/lib/auth';
import {
  checkRateLimit,
  getClientKey,
  rateLimit,
  resetRateLimit,
} from '@/lib/rate-limit';

const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60 * 1000;
const ACCOUNT_FAILURE_LIMIT = 5;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

const LoginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(200),
});

function tooManyAttempts(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'محاولات كثيرة. حاولي مرة أخرى لاحقًا.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function POST(req: Request) {
  try {
    // حد المصدر يُحتسب على كل طلب، وليس على محاولات الدخول الفاشلة فقط.
    const ipLimit = await rateLimit(
      `admin-login:ip:${getClientKey(req)}`,
      IP_LIMIT,
      IP_WINDOW_MS,
    );
    if (!ipLimit.ok) return tooManyAttempts(ipLimit.reset);

    const rawBody = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'بيانات الدخول غير صالحة.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { email, password } = parsed.data;
    const accountKey = `admin-login:account:${email}`;

    // فحص فقط؛ هذا الاستدعاء لا يزيد عداد الحساب.
    const accountStatus = await checkRateLimit(
      accountKey,
      ACCOUNT_FAILURE_LIMIT,
      ACCOUNT_WINDOW_MS,
    );
    if (!accountStatus.ok) return tooManyAttempts(accountStatus.reset);

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = user?.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : false;
    const authenticated = Boolean(user && user.active && passwordMatches);

    if (!authenticated || !user) {
      // يزيد عداد الحساب عند الفشل فقط، ويستخدم مفتاحًا موحدًا للحساب الموجود وغير الموجود.
      const failedAttempt = await rateLimit(
        accountKey,
        ACCOUNT_FAILURE_LIMIT,
        ACCOUNT_WINDOW_MS,
      );

      if (!failedAttempt.ok) return tooManyAttempts(failedAttempt.reset);

      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        severity: 'INFO',
      },
    });

    await createSession(user.id);
    await resetRateLimit(accountKey, ACCOUNT_WINDOW_MS);

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      'ADMIN_LOGIN_ERROR:',
      error instanceof Error ? error.message : 'unknown',
    );

    return NextResponse.json(
      { error: 'تعذر تنفيذ تسجيل الدخول حاليًا.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
