import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
    },
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
