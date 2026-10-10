import { PaymentStatus, Prisma } from '@prisma/client';

type Transaction = Prisma.TransactionClient;

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['PENDING', 'CONFIRMED', 'FAILED'],
  CONFIRMED: ['CONFIRMED'],
  FAILED: ['FAILED', 'PENDING'],
};

export class PaymentStateTransitionError extends Error {
  readonly code = 'INVALID_PAYMENT_TRANSITION';

  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(`لا يمكن نقل الدفع من ${from} إلى ${to}`);
    this.name = 'PaymentStateTransitionError';
  }
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) throw new PaymentStateTransitionError(from, to);
}

export type UpdatePaymentInput = {
  orderId: string;
  paymentId?: string;
  status: PaymentStatus;
  actorName?: string | null;
  note?: string | null;
  reference?: string | null;
};

/** Updates a payment and keeps the parent Order.paymentStatus synchronized. */
export async function updatePaymentStatus(tx: Transaction, input: UpdatePaymentInput) {
  const payment = await tx.payment.findFirst({
    where: {
      orderId: input.orderId,
      ...(input.paymentId ? { id: input.paymentId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) throw new Error('عملية الدفع غير موجودة');

  assertPaymentTransition(payment.status, input.status);

  const reference = input.reference !== undefined
    ? input.reference?.trim().slice(0, 100) || null
    : payment.reference;
  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: input.status,
      reference,
      confirmedAt: input.status === 'CONFIRMED' ? payment.confirmedAt || new Date() : null,
    },
  });

  await tx.order.update({
    where: { id: input.orderId },
    data: { paymentStatus: input.status },
  });

  await tx.orderTimeline.create({
    data: {
      orderId: input.orderId,
      status: `PAYMENT_${input.status}`,
      note: input.note?.trim() || `تم تحديث حالة الدفع إلى ${input.status} بواسطة ${input.actorName || 'المسؤول'}`,
    },
  });

  return updated;
}

export type SetPaymentReferenceInput = {
  orderId: string;
  paymentId?: string;
  reference: string | null;
};

export async function setPaymentReference(tx: Transaction, input: SetPaymentReferenceInput) {
  const reference = input.reference?.trim().slice(0, 100) || null;
  const payment = await tx.payment.findFirst({
    where: {
      orderId: input.orderId,
      ...(input.paymentId ? { id: input.paymentId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) throw new Error('عملية الدفع غير موجودة');

  return tx.payment.update({
    where: { id: payment.id },
    data: { reference },
  });
}
