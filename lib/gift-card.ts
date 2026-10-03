import crypto from 'crypto';
import { Prisma } from '@prisma/client';

export const normalizeGiftCardCode = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();

export function hashGiftCardCode(code: string) {
  return crypto.createHash('sha256').update(normalizeGiftCardCode(code)).digest('hex');
}

export function generateGiftCardCode() {
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `WAHAJ-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function giftCardIsUsable(card: { active: boolean; expiresAt: Date | null; balance: Prisma.Decimal | number | string }) {
  return card.active && Number(card.balance) > 0 && (!card.expiresAt || card.expiresAt > new Date());
}

export async function refundGiftCardForOrder(tx: Prisma.TransactionClient, order: { id: string; number: string; giftCardId: string | null; giftCardAmount: Prisma.Decimal | number | string }) {
  const amount = Number(order.giftCardAmount || 0);
  if (!order.giftCardId || amount <= 0) return;

  const card = await tx.giftCard.findUnique({ where: { id: order.giftCardId }, select: { id: true, balance: true, amount: true } });
  if (!card) throw new Error('بطاقة الهدايا المرتبطة بالطلب غير موجودة');

  const newBalance = Math.min(Number(card.amount), Number(card.balance) + amount);
  const refunded = newBalance - Number(card.balance);
  if (refunded <= 0) return;

  await tx.giftCard.update({ where: { id: card.id }, data: { balance: newBalance } });
  await tx.giftCardLedger.create({
    data: {
      giftCardId: card.id,
      type: 'REFUND',
      amount: refunded,
      balanceAfter: newBalance,
      orderId: order.id,
      reference: order.number,
      note: 'إعادة رصيد بطاقة الهدايا بعد إلغاء الطلب',
    },
  });
}
