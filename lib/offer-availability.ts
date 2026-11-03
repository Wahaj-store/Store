export type OfferAvailability = {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
};

export function isOfferAvailableForDisplay(
  offer: OfferAvailability,
  now: Date = new Date(),
): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  if (offer.startsAt && offer.startsAt.getTime() > now.getTime()) return false;
  if (offer.endsAt && offer.endsAt.getTime() < now.getTime()) return false;
  if (offer.maxUses !== null && offer.usedCount >= offer.maxUses) return false;
  return offer.active;
}
