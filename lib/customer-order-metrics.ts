import { prisma } from '@/lib/prisma';

export type CustomerOrderMetrics = {
  orderCount: number;
  spend: number;
  lastOrder: Date | null;
};

/** Fetch only the aggregate fields needed for customer segmentation. */
export async function getCustomerOrderMetrics(customerId: string): Promise<CustomerOrderMetrics> {
  const result = await prisma.order.aggregate({
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
