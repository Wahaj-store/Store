import { NextResponse } from 'next/server';

const disabledResponse = () =>
  NextResponse.json(
    { error: 'نظام الكوبونات متوقف وتم استبداله بالعروض وبطاقات الهدايا.' },
    { status: 410 },
  );

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}

export async function PUT() {
  return disabledResponse();
}

export async function DELETE() {
  return disabledResponse();
}
