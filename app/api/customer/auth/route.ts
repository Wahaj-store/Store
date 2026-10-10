'use strict';

import { rateLimit, getClientKey } from '@/lib/rate-limit';
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
      cookies().delete('wahaj_customer');
      return NextResponse.json({ ok: true });
    }

    const limit = await rateLimit(
      `customer-auth:${body.action}:${getClientKey(req)}`,
      body.action === 'register' ? 5 : 8,
      15 * 60 * 1000,
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات. حاولي مرة أخرى لاحقًا.' },
        { status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' } },
      );
    }

    if (!body.password) return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 });
    if (body.action === 'register' && (!body.name || !body.phone)) {
      return NextResponse.json({ error: 'الاسم ورقم الهاتف مطلوبان للتسجيل' }, { status: 400 });
    }

    const customer = body.action === 'register'
      ? await customerRegister({
          name: body.name || '',
          phone: body.phone || '',
          email: body.email,
          password: body.password,
          rememberMe: Boolean(body.rememberMe),
        })
      : await customerLogin(body.email || body.phone || '', body.password, Boolean(body.rememberMe));

    return NextResponse.json(publicCustomer(customer));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'البيانات غير صالحة' }, { status: 400 });
    }
    // لا نمرر أخطاء قاعدة البيانات أو وجود الحساب إلى العميل.
    return NextResponse.json({ error: 'تعذر تنفيذ العملية بالبيانات المدخلة. تحققي منها وحاولي مرة أخرى.' }, { status: 400 });
  }
}
