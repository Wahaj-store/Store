import { NextResponse } from 'next/server';
import { processNotificationOutboxBatch } from '@/lib/notification-outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const result = await processNotificationOutboxBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('NOTIFICATION_OUTBOX_CRON_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر معالجة الإشعارات المؤجلة' }, { status: 500 });
  }
}
