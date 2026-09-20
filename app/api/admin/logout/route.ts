import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await clearSession();
    
    // إعادة التوجيه تلقائياً إلى صفحة تسجيل الدخول
    return NextResponse.redirect(new URL('/admin/login', request.url), {
      status: 303,
    });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء تسجيل الخروج' }, { status: 500 });
  }
}
