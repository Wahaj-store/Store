import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type MetricsReadClient = Pick<Prisma.TransactionClient, 'order'>;

export type CustomerOrderMetrics = {
  orderCount: number;
  spend: number;
  lastOrder: Date | null;
};

/** Fetch only the aggregate fields needed for customer segmentation. */
export async function getCustomerOrderMetrics(
  customerId: string,
  client: MetricsReadClient = prisma,
): Promise<CustomerOrderMetrics> {
  const result = await client.order.aggregate({
    where: { customerId, status: { not: 'CANCELLED' } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
  });

  return {
    orderCount: result._count._all,
    spend: Number(result._sum.total ?? 0),
    lastOrder: result._max.createdAt,
  };
}
