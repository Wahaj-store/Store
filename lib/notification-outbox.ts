import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notifyOrderCreatedByEmail } from '@/lib/email';
import { notifyOrderCreated } from '@/lib/whatsapp';

const MAX_ATTEMPTS = 8;
const LOCK_DURATION_MS = 2 * 60 * 1000;
// العامل يعمل مرة يوميًا على Vercel Hobby؛ اجعل المهمة جاهزة قبل التشغيل التالي.
const RETRY_DELAY_MS = 20 * 60 * 60 * 1000;

const EmailPayload = z.object({
  email: z.string().trim().min(1).max(320),
  name: z.string().nullable().optional(),
  orderNumber: z.string().min(1).max(40),
  total: z.number().finite().nonnegative(),
  paymentMethod: z.string().min(1).max(50),
});

const WhatsAppPayload = z.object({
  id: z.string().min(1),
  number: z.string().min(1).max(40),
  customerId: z.string().nullable().optional(),
  phone: z.string().min(1).max(40),
  total: z.number().finite().nonnegative(),
  paymentMethod: z.string().min(1).max(50),
});

export type NotificationOutboxResult = 'sent' | 'failed' | 'skipped' | 'busy';

type OutboxDependencies = {
  db: Pick<typeof prisma, 'notificationOutbox'>;
  sendEmail: typeof notifyOrderCreatedByEmail;
  sendWhatsApp: typeof notifyOrderCreated;
  now: () => Date;
};

type OutboxDependencyOverrides = Partial<OutboxDependencies>;

function resolveDependencies(overrides: OutboxDependencyOverrides = {}): OutboxDependencies {
  return {
    db: overrides.db ?? prisma,
    sendEmail: overrides.sendEmail ?? notifyOrderCreatedByEmail,
    sendWhatsApp: overrides.sendWhatsApp ?? notifyOrderCreated,
    now: overrides.now ?? (() => new Date()),
  };
}

function errorMessage(error: unknown) {
  return String(error instanceof Error ? error.message : error).slice(0, 1000);
}

export async function processNotificationOutboxItem(
  id: string,
  overrides: OutboxDependencyOverrides = {},
): Promise<NotificationOutboxResult> {
  const dependencies = resolveDependencies(overrides);
  const repository = dependencies.db.notificationOutbox;
  const now = dependencies.now();
  const claimed = await repository.updateMany({
    where: {
      id,
      OR: [
        {
          status: { in: ['PENDING', 'FAILED'] },
          attempts: { lt: MAX_ATTEMPTS },
          nextAttemptAt: { lte: now },
        },
        {
          status: 'PROCESSING',
          lockedUntil: { lte: now },
        },
      ],
    },
    data: {
      status: 'PROCESSING',
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claimed.count !== 1) return 'busy';

  const item = await repository.findUnique({ where: { id } });
  if (!item) return 'failed';

  // تسمح هذه المطالبة الختامية بوضع العنصر في FAILED إن انتهت المهلة بعد آخر محاولة.
  if (item.attempts > MAX_ATTEMPTS) {
    await repository.update({
      where: { id },
      data: {
        status: 'FAILED',
        lockedUntil: null,
        lastError: item.lastError || 'تم استنفاد عدد محاولات الإرسال',
      },
    });
    return 'failed';
  }

  try {
    if (item.channel === 'EMAIL_ORDER_CREATED') {
      const payload = EmailPayload.parse(item.payload);
      const sent = await dependencies.sendEmail(payload);
      if (!sent) throw new Error('لم يقبل مزود البريد رسالة تأكيد الطلب');
    } else if (item.channel === 'WHATSAPP_ORDER_CREATED') {
      const payload = WhatsAppPayload.parse(item.payload);
      const result = await dependencies.sendWhatsApp(payload);
      if (!result.ok) {
        if (result.skipped && result.reason === 'invalid_phone') {
          await repository.update({
            where: { id },
            data: {
              status: 'SKIPPED',
              lockedUntil: null,
              lastError: 'رقم الهاتف غير صالح لإرسال WhatsApp',
            },
          });
          return 'skipped';
        }
        throw new Error(`تعذر إرسال إشعار WhatsApp: ${result.reason}`);
      }
    } else {
      await repository.update({
        where: { id },
        data: {
          status: 'SKIPPED',
          lockedUntil: null,
          lastError: `نوع إشعار غير مدعوم: ${item.channel}`.slice(0, 1000),
        },
      });
      return 'skipped';
    }

    await repository.update({
      where: { id },
      data: { status: 'SENT', sentAt: dependencies.now(), lockedUntil: null, lastError: null },
    });
    return 'sent';
  } catch (error) {
    const message = errorMessage(error);
    await repository.update({
      where: { id },
      data: {
        status: 'FAILED',
        lockedUntil: null,
        nextAttemptAt: new Date(now.getTime() + RETRY_DELAY_MS),
        lastError: message,
      },
    });
    console.error('Notification outbox delivery failed:', { id, channel: item.channel, error: message });
    return 'failed';
  }
}

export async function processNotificationOutboxBatch(
  overrides: OutboxDependencyOverrides = {},
) {
  const dependencies = resolveDependencies(overrides);
  const now = dependencies.now();
  const items = await dependencies.db.notificationOutbox.findMany({
    where: {
      OR: [
        {
          status: { in: ['PENDING', 'FAILED'] },
          attempts: { lt: MAX_ATTEMPTS },
          nextAttemptAt: { lte: now },
        },
        {
          status: 'PROCESSING',
          lockedUntil: { lte: now },
        },
      ],
    },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: 24,
    select: { id: true },
  });

  const totals = { checked: items.length, sent: 0, failed: 0, skipped: 0, busy: 0 };
  const concurrency = 4;
  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    const results = await Promise.allSettled(
      chunk.map(({ id }) => processNotificationOutboxItem(id, dependencies)),
    );
    for (const result of results) {
      const outcome = result.status === 'fulfilled' ? result.value : 'failed';
      totals[outcome] += 1;
      if (result.status === 'rejected') {
        console.error('Notification outbox worker error:', errorMessage(result.reason));
      }
    }
  }

  return totals;
}
