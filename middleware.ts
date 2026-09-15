import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname === '/admin/login') return NextResponse.next();
  const secretValue = process.env.AUTH_SECRET;
  const token = req.cookies.get('wahaj_session')?.value;
  if (!secretValue || secretValue.length < 32 || !token) return NextResponse.redirect(new URL('/admin/login', req.url));
  try { await jwtVerify(token, new TextEncoder().encode(secretValue), { audience: 'admin' }); return NextResponse.next(); }
  catch { return NextResponse.redirect(new URL('/admin/login', req.url)); }
}
export const config = { matcher: ['/admin/:path*'] };
