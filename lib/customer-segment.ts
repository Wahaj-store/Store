export type CustomerSegmentKey = 'vip' | 'loyal' | 'highValue' | 'new' | 'atRisk' | 'dormant' | 'noPurchase';

const DAY = 24 * 60 * 60 * 1000;

export function getCustomerSegmentKey(args: { orderCount: number; spend: number; lastOrder: Date | null; now?: Date }): CustomerSegmentKey {
  const now = args.now ?? new Date();
  const orderCount = Number.isFinite(args.orderCount) ? Math.max(0, Math.trunc(args.orderCount)) : 0;
  const spend = Number.isFinite(args.spend) ? Math.max(0, args.spend) : 0;
  if (orderCount === 0) return 'noPurchase';
  if (spend >= 10000 || orderCount >= 5) return 'vip';
  if (orderCount >= 3) return 'loyal';
  if (spend >= 5000) return 'highValue';
  const timestamp = args.lastOrder?.getTime();
  const daysSince = timestamp !== undefined && Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((now.getTime() - timestamp) / DAY))
    : null;
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
