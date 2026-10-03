import { DiscountType, OfferType } from '@prisma/client';

export type PricingLine = {
  quantity: number;
  unitPrice: number;
  productId?: string;
  categoryId?: string;
};

export type OfferPricing = {
  id: string;
  name: string;
  type: OfferType;
  discountType: DiscountType;
  discountValue: number | null;
  minOrder: number | null;
  maxDiscount: number | null;
  priority: number;
  stackable: boolean;
  maxUses: number | null;
  usedCount: number;
  productId: string | null;
  categoryId: string | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  getDiscountPercent: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  segmentKeys: string[];
};

export type AppliedOffer = { id: string; name: string; discount: number };

export type PricingResult = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  offerName?: string;
  appliedOffers: AppliedOffer[];
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calculateSubtotal(lines: PricingLine[]) {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
}

function isActiveOffer(offer: OfferPricing, now: Date) {
  return offer.active
    && (!offer.startsAt || offer.startsAt <= now)
    && (!offer.endsAt || offer.endsAt >= now)
    && (offer.maxUses === null || offer.usedCount < offer.maxUses);
}

function targetsCustomer(offer: OfferPricing, customerSegmentKey: string | null) {
  if (!offer.segmentKeys.length) return true;
  return customerSegmentKey !== null && offer.segmentKeys.includes(customerSegmentKey);
}

function targetsLine(offer: OfferPricing, line: PricingLine) {
  if (offer.productId && offer.productId !== line.productId) return false;
  if (offer.categoryId && offer.categoryId !== line.categoryId) return false;
  return true;
}

function percentageOrFixed(base: number, type: DiscountType, value: number | null) {
  if (value === null) return 0;
  const raw = type === DiscountType.PERCENTAGE ? base * (clamp(value, 0, 100) / 100) : value;
  return roundMoney(Math.min(base, Math.max(0, raw)));
}

function eligibleBase(lines: PricingLine[], offer: OfferPricing) {
  return roundMoney(lines.filter(line => targetsLine(offer, line)).reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
}

function calculateOfferDiscount(subtotal: number, lines: PricingLine[], offer: OfferPricing, isFirstOrder: boolean, customerSegmentKey: string | null, now: Date) {
  if (!isActiveOffer(offer, now) || !targetsCustomer(offer, customerSegmentKey) || (offer.minOrder !== null && subtotal < offer.minOrder)) return 0;
  if (offer.type === OfferType.FREE_SHIPPING) return 0;
  if (offer.type === OfferType.FIRST_ORDER && !isFirstOrder) return 0;

  const base = eligibleBase(lines, offer);
  if (base <= 0) return 0;

  let discount = 0;
  if (offer.type === OfferType.BUY_X_GET_Y) {
    const buy = Math.max(1, offer.buyQuantity || 0);
    const get = Math.max(1, offer.getQuantity || 0);
    if (!offer.buyQuantity || !offer.getQuantity) return 0;
    const eligibleUnits = lines.filter(line => targetsLine(offer, line));
    const totalQty = eligibleUnits.reduce((sum, line) => sum + line.quantity, 0);
    const sets = Math.floor(totalQty / (buy + get));
    if (!sets) return 0;
    const freeUnits = sets * get;
    const sorted = [...eligibleUnits].sort((a, b) => a.unitPrice - b.unitPrice);
    let remaining = freeUnits;
    for (const line of sorted) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, line.quantity);
      const percent = clamp(offer.getDiscountPercent ?? 100, 0, 100) / 100;
      discount += line.unitPrice * qty * percent;
      remaining -= qty;
    }
  } else {
    discount = percentageOrFixed(base, offer.discountType, offer.discountValue);
  }

  if (offer.maxDiscount !== null) discount = Math.min(discount, Math.max(0, offer.maxDiscount));
  return roundMoney(Math.min(base, Math.max(0, discount)));
}

export function hasFreeShippingOffer(offers: OfferPricing[], isFirstOrder: boolean, now = new Date()) {
  return offers.some(offer => isActiveOffer(offer, now) && offer.type === OfferType.FREE_SHIPPING);
}

export function calculatePricing(args: {
  lines: PricingLine[];
  shippingPrice: number;
  shippingFreeAbove: number | null;
  offers?: OfferPricing[];
  isFirstOrder?: boolean;
  customerSegmentKey?: string | null;
  now?: Date;
}): PricingResult {
  const now = args.now ?? new Date();
  const subtotal = calculateSubtotal(args.lines);
  const isFirstOrder = Boolean(args.isFirstOrder);
  const customerSegmentKey = args.customerSegmentKey ?? null;
  const offers = args.offers ?? [];
  const eligible = offers
    .filter(offer => isActiveOffer(offer, now))
    .map(offer => ({ offer, discount: calculateOfferDiscount(subtotal, args.lines, offer, isFirstOrder, customerSegmentKey, now) }))
    .filter(x => x.discount > 0)
    .sort((a, b) => b.offer.priority - a.offer.priority || b.discount - a.discount);

  const stackable = eligible.filter(x => x.offer.stackable);
  const nonStackable = eligible.filter(x => !x.offer.stackable);
  const selected = stackable.length ? stackable : nonStackable.slice(0, 1);
  const offerDiscount = roundMoney(Math.min(subtotal, selected.reduce((sum, x) => sum + x.discount, 0)));
  const discount = offerDiscount;
  const appliedOffers = selected.map(x => ({ id: x.offer.id, name: x.offer.name, discount: x.discount }));

  const freeByThreshold = args.shippingFreeAbove !== null && subtotal - discount >= args.shippingFreeAbove;
  const freeShippingOffer = offers
    .filter(offer => isActiveOffer(offer, now) && targetsCustomer(offer, customerSegmentKey) && offer.type === OfferType.FREE_SHIPPING)
    .filter(offer => offer.minOrder === null || subtotal >= offer.minOrder)
    .filter(offer => eligibleBase(args.lines, offer) > 0)
    .sort((a, b) => b.priority - a.priority)[0];
  const freeByOffer = Boolean(freeShippingOffer);
  const freeShipping = freeByThreshold || freeByOffer;
  const shipping = freeShipping ? 0 : roundMoney(Math.max(0, args.shippingPrice));
  const total = roundMoney(Math.max(0, subtotal + shipping - discount));
  const finalAppliedOffers = [...appliedOffers];
  if (freeShippingOffer && !finalAppliedOffers.some(x => x.id === freeShippingOffer.id)) {
    finalAppliedOffers.push({ id: freeShippingOffer.id, name: freeShippingOffer.name, discount: 0 });
  }

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping,
    appliedOffers: finalAppliedOffers,
    ...(finalAppliedOffers.length ? { offerName: finalAppliedOffers.map(x => x.name).join(' + ') } : {}),
  };
}
