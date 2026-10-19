'use strict';

import { checkRateLimit, rateLimit, getClientKey, resetRateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { customerLogin, customerRegister, getCustomer } from '@/lib/customer-auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const AuthSchema = z.object({
  action: z.enum(['login', 'register', 'logout']).default('login'),
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(8).max(30).optional(),
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(8).max(200).optional(),
  rememberMe: z.boolean().optional(),
});

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function publicCustomer(customer: { id: string; name: string | null; phone: string | null; email: string | null }) {
  return { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email };
}

export async function GET() {
  const customer = await getCustomer();
  return NextResponse.json(customer ? publicCustomer(customer) : null, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  try {
    const body = AuthSchema.parse(await req.json().catch(() => null));

    if (body.action === 'logout') {
      (await cookies()).delete('wahaj_customer');
      await resetRateLimit(`customer-auth:login:${getClientKey(req)}`, LOGIN_WINDOW_MS);
      return NextResponse.json({ ok: true });
    }

    const clientKey = getClientKey(req);
    const loginKey = `customer-auth:login:${clientKey}`;
    const limit = body.action === 'login'
      ? await checkRateLimit(loginKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)
      : await rateLimit(`customer-auth:register:${clientKey}`, 5, LOGIN_WINDOW_MS);
    if (!limit.ok) {
      const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: `تم تجاوز عدد المحاولات. حاولي مرة أخرى بعد ${Math.ceil(retryAfter / 60)} دقيقة.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
      );
    }

    if (!body.password) return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 });
    if (body.action === 'register' && (!body.name || !body.phone)) {
      return NextResponse.json({ error: 'الاسم ورقم الهاتف مطلوبان للتسجيل' }, { status: 400 });
    }

    let customer;
    try {
      customer = body.action === 'register'
        ? await customerRegister({
            name: body.name || '',
            phone: body.phone || '',
            email: body.email,
            password: body.password,
            rememberMe: Boolean(body.rememberMe),
          })
        : await customerLogin(body.email || body.phone || '', body.password, Boolean(body.rememberMe));
    } catch (error) {
      if (body.action === 'login') {
        await rateLimit(loginKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
      }
      throw error;
    }

    if (body.action === 'login') {
      await resetRateLimit(loginKey, LOGIN_WINDOW_MS);
    }

    return NextResponse.json(publicCustomer(customer));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'البيانات غير صالحة' }, { status: 400 });
    }
    // لا نمرر أخطاء قاعدة البيانات أو وجود الحساب إلى العميل.
    return NextResponse.json({ error: 'تعذر تنفيذ العملية بالبيانات المدخلة. تحققي منها وحاولي مرة أخرى.' }, { status: 400 });
  }
}
