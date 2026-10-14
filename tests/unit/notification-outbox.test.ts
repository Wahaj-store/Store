import assert from 'node:assert/strict';
import test from 'node:test';

import {
  processNotificationOutboxBatch,
  processNotificationOutboxItem,
} from '../../lib/notification-outbox';

const NOW = new Date('2026-10-14T16:00:00.000Z');

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outbox-1',
    eventKey: 'order-created:email:order-1',
    orderId: 'order-1',
    channel: 'EMAIL_ORDER_CREATED',
    payload: {
      email: 'customer@example.com',
      name: 'Customer',
      orderNumber: 'WAH-12345678',
      total: 450,
      paymentMethod: 'COD',
    },
    status: 'PENDING',
    attempts: 0,
    nextAttemptAt: new Date(NOW.getTime() - 1_000),
    lockedUntil: null as Date | null,
    lastError: null as string | null,
    sentAt: null as Date | null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createHarness(initialItem = makeItem()) {
  const item = { ...initialItem };
  const repository = {
    async updateMany({ where, data }: any) {
      if (where.id !== item.id) return { count: 0 };
      const now = where.OR[0].nextAttemptAt.lte as Date;
      const eligible = where.OR.some((condition: any) => {
        if (condition.status?.in) {
          return condition.status.in.includes(item.status)
            && item.attempts < condition.attempts.lt
            && item.nextAttemptAt <= condition.nextAttemptAt.lte;
        }
        return item.status === condition.status
          && item.lockedUntil instanceof Date
          && item.lockedUntil <= condition.lockedUntil.lte;
      });
      if (!eligible || now.getTime() !== NOW.getTime()) return { count: 0 };

      item.status = data.status;
      item.lockedUntil = data.lockedUntil;
      item.attempts += data.attempts.increment;
      item.lastError = data.lastError;
      return { count: 1 };
    },
    async findUnique() {
      return item;
    },
    async update({ where, data }: any) {
      assert.equal(where.id, item.id);
      Object.assign(item, data);
      return item;
    },
    async findMany() {
      return [{ id: item.id }];
    },
  };

  return {
    item,
    db: { notificationOutbox: repository } as any,
    now: () => new Date(NOW),
  };
}

test('marks a successfully delivered email as SENT exactly once', async () => {
  const harness = createHarness();
  let sendCount = 0;

  const result = await processNotificationOutboxItem('outbox-1', {
    db: harness.db,
    now: harness.now,
    sendEmail: async () => {
      sendCount += 1;
      return true;
    },
  });

  assert.equal(result, 'sent');
  assert.equal(sendCount, 1);
  assert.equal(harness.item.status, 'SENT');
  assert.equal(harness.item.attempts, 1);
  assert.ok(harness.item.sentAt instanceof Date);
  assert.equal(harness.item.lockedUntil, null);
});

test('records a provider failure and delays another attempt until the next daily run', async () => {
  const harness = createHarness();
  let sendCount = 0;
  const dependencies = {
    db: harness.db,
    now: harness.now,
    sendEmail: async () => {
      sendCount += 1;
      return false;
    },
  };

  assert.equal(await processNotificationOutboxItem('outbox-1', dependencies), 'failed');
  assert.equal(harness.item.status, 'FAILED');
  assert.equal(harness.item.lastError, 'لم يقبل مزود البريد رسالة تأكيد الطلب');
  assert.equal(harness.item.nextAttemptAt.getTime(), NOW.getTime() + 20 * 60 * 60 * 1000);

  assert.equal(await processNotificationOutboxItem('outbox-1', dependencies), 'busy');
  assert.equal(sendCount, 1);
});

test('only one concurrent worker claims an outbox item', async () => {
  const harness = createHarness();
  let sendCount = 0;
  const dependencies = {
    db: harness.db,
    now: harness.now,
    sendEmail: async () => {
      sendCount += 1;
      return true;
    },
  };

  const results = await Promise.all([
    processNotificationOutboxItem('outbox-1', dependencies),
    processNotificationOutboxItem('outbox-1', dependencies),
  ]);

  assert.deepEqual(results.sort(), ['busy', 'sent']);
  assert.equal(sendCount, 1);
  assert.equal(harness.item.attempts, 1);
});

test('recovers an expired PROCESSING lease and sends the pending message', async () => {
  const harness = createHarness(makeItem({
    status: 'PROCESSING',
    attempts: 1,
    lockedUntil: new Date(NOW.getTime() - 1_000),
  }));
  let sendCount = 0;

  const result = await processNotificationOutboxItem('outbox-1', {
    db: harness.db,
    now: harness.now,
    sendEmail: async () => {
      sendCount += 1;
      return true;
    },
  });

  assert.equal(result, 'sent');
  assert.equal(sendCount, 1);
  assert.equal(harness.item.attempts, 2);
  assert.equal(harness.item.status, 'SENT');
});

test('moves an expired lease beyond the retry limit to FAILED without sending', async () => {
  const harness = createHarness(makeItem({
    status: 'PROCESSING',
    attempts: 8,
    lockedUntil: new Date(NOW.getTime() - 1_000),
  }));
  let sendCount = 0;

  const result = await processNotificationOutboxItem('outbox-1', {
    db: harness.db,
    now: harness.now,
    sendEmail: async () => {
      sendCount += 1;
      return true;
    },
  });

  assert.equal(result, 'failed');
  assert.equal(sendCount, 0);
  assert.equal(harness.item.attempts, 9);
  assert.equal(harness.item.status, 'FAILED');
  assert.equal(harness.item.lastError, 'تم استنفاد عدد محاولات الإرسال');
});

test('marks an invalid WhatsApp recipient as SKIPPED instead of retrying it', async () => {
  const harness = createHarness(makeItem({
    eventKey: 'order-created:whatsapp:order-1',
    channel: 'WHATSAPP_ORDER_CREATED',
    payload: {
      id: 'order-1',
      number: 'WAH-12345678',
      customerId: 'customer-1',
      phone: '123',
      total: 450,
      paymentMethod: 'COD',
    },
  }));

  const result = await processNotificationOutboxItem('outbox-1', {
    db: harness.db,
    now: harness.now,
    sendWhatsApp: async () => ({ ok: false, skipped: true, reason: 'invalid_phone' }),
  });

  assert.equal(result, 'skipped');
  assert.equal(harness.item.status, 'SKIPPED');
  assert.equal(harness.item.lockedUntil, null);
  assert.match(harness.item.lastError || '', /غير صالح/);
});

test('batch worker reports per-item delivery outcomes', async () => {
  const harness = createHarness();

  const result = await processNotificationOutboxBatch({
    db: harness.db,
    now: harness.now,
    sendEmail: async () => false,
  });

  assert.deepEqual(result, { checked: 1, sent: 0, failed: 1, skipped: 0, busy: 0 });
});
