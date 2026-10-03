export type CustomerSegmentKey = 'vip' | 'loyal' | 'highValue' | 'new' | 'atRisk' | 'dormant' | 'noPurchase';

const DAY = 24 * 60 * 60 * 1000;

export function getCustomerSegmentKey(args: { orderCount: number; spend: number; lastOrder: Date | null; now?: Date }): CustomerSegmentKey {
  const now = args.now ?? new Date();
  if (args.orderCount === 0) return 'noPurchase';
  if (args.spend >= 10000 || args.orderCount >= 5) return 'vip';
  if (args.orderCount >= 3) return 'loyal';
  if (args.spend >= 5000) return 'highValue';
  const daysSince = args.lastOrder ? Math.floor((now.getTime() - args.lastOrder.getTime()) / DAY) : null;
  if (daysSince !== null && daysSince <= 30) return 'new';
  if (daysSince !== null && daysSince <= 90) return 'atRisk';
  return 'dormant';
}

export const CUSTOMER_SEGMENT_OPTIONS = [
  { key: 'vip', name: 'عملاء VIP' },
  { key: 'loyal', name: 'عملاء أوفياء' },
  { key: 'highValue', name: 'قيمة مرتفعة' },
  { key: 'new', name: 'عملاء نشطون حديثًا' },
  { key: 'atRisk', name: 'معرضون للفقد' },
  { key: 'dormant', name: 'عملاء غير نشطين' },
  { key: 'noPurchase', name: 'بدون شراء' },
] as const;
