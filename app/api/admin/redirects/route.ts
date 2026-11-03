import { NextResponse } from 'next/server';

import { requirePermission as requireApiPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function deniedResponse(status: 401 | 403) {
  return NextResponse.json({ error: 'غير مصرح' }, { status });
}

export async function GET() {
  const authorization = await requireApiPermission('settingsRead');
  if (!authorization.user) return deniedResponse(authorization.status);

  const redirects = await prisma.redirect.findMany({ orderBy: { fromPath: 'asc' } });
  return NextResponse.json(redirects);
}

export async function POST(req: Request) {
  const authorization = await requireApiPermission('settingsWrite');
  if (!authorization.user) return deniedResponse(authorization.status);

  const body = await req.json();
  if (!body.fromPath || !body.toPath) {
    return NextResponse.json({ error: 'المسار مطلوب' }, { status: 400 });
  }

  const redirect = await prisma.redirect.create({
    data: {
      fromPath: body.fromPath,
      toPath: body.toPath,
      statusCode: Number(body.statusCode) || 301,
      active: body.active !== false,
    },
  });
  return NextResponse.json(redirect);
}

export async function PUT(req: Request) {
  const authorization = await requireApiPermission('settingsWrite');
  if (!authorization.user) return deniedResponse(authorization.status);

  const body = await req.json();
  const redirect = await prisma.redirect.update({
    where: { id: body.id },
    data: {
      fromPath: body.fromPath,
      toPath: body.toPath,
      statusCode: Number(body.statusCode) || 301,
      active: Boolean(body.active),
    },
  });
  return NextResponse.json(redirect);
}

export async function DELETE(req: Request) {
  const authorization = await requireApiPermission('settingsWrite');
  if (!authorization.user) return deniedResponse(authorization.status);

  const body = await req.json();
  await prisma.redirect.delete({ where: { id: body.id } });
  return NextResponse.json({ ok: true });
}
