import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export type AbandonedCartItem = {
  productId: string;
  variantId?: string;
  variantName?: string | null;
  variantValue?: string | null;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
};

export function cartHash(items: AbandonedCartItem[]) {
  const normalized = items
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: Number(item.quantity),
    }))
    .sort((a, b) => `${a.productId}:${a.variantId || ''}`.localeCompare(`${b.productId}:${b.variantId || ''}`));
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export async function markLatestCartRecovered(customerId: string, orderId: string) {
  const cart = await prisma.abandonedCart.findUnique({ where: { customerId } });
  if (!cart || cart.status === 'CLEARED' || cart.status === 'RECOVERED') return;
  await prisma.abandonedCart.update({
    where: { id: cart.id },
    data: { status: 'RECOVERED', recoveredAt: new Date(), orderId },
  });
}
