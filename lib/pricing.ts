import { DiscountType, OfferType } from '@prisma/client';

export type PricingLine = {
  quantity: number;
  unitPrice: number;
};

export type CouponPricing = {
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number | null;
};

export type OfferPricing = {
  name: string;
  type: OfferType;
  discountValue: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

export type PricingResult = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  couponCode?: string;
  offerName?: string;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateSubtotal(lines: PricingLine[]) {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
}

export function calculateCouponDiscount(subtotal: number, coupon: CouponPricing) {
  if (coupon.minOrder !== null && subtotal < coupon.minOrder) return 0;

  const raw = coupon.type === DiscountType.PERCENTAGE
    ? subtotal * (coupon.value / 100)
    : coupon.value;

  return roundMoney(Math.min(subtotal, Math.max(0, raw)));
}

function isActiveOffer(offer: OfferPricing, now: Date) {
  return offer.active
    && (!offer.startsAt || offer.startsAt <= now)
    && (!offer.endsAt || offer.endsAt >= now);
}

/**
 * Offer.discountValue is treated as a percentage for discount-bearing offers.
 * BUY_X_GET_Y is intentionally not applied because the current schema has no X/Y fields;
 * this prevents the engine from inventing a promotion rule that Admin cannot configure.
 */
export function calculateOfferDiscount(subtotal: number, offer: OfferPricing, isFirstOrder: boolean, now = new Date()) {
  if (!isActiveOffer(offer, now) || offer.discountValue === null) return 0;
  if (offer.type === OfferType.FREE_SHIPPING || offer.type === OfferType.BUY_X_GET_Y) return 0;
  if (offer.type === OfferType.FIRST_ORDER && !isFirstOrder) return 0;

  const percentage = Math.min(100, Math.max(0, offer.discountValue));
  return roundMoney(subtotal * (percentage / 100));
}

export function hasFreeShippingOffer(offers: OfferPricing[], isFirstOrder: boolean, now = new Date()) {
  return offers.some(offer => isActiveOffer(offer, now)
    && offer.type === OfferType.FREE_SHIPPING
    && offer.type === OfferType.FREE_SHIPPING);
}

export function calculatePricing(args: {
  lines: PricingLine[];
  shippingPrice: number;
  shippingFreeAbove: number | null;
  coupon?: CouponPricing;
  offers?: OfferPricing[];
  isFirstOrder?: boolean;
  now?: Date;
}) : PricingResult {
  const now = args.now ?? new Date();
  const subtotal = calculateSubtotal(args.lines);
  const isFirstOrder = Boolean(args.isFirstOrder);
  const offers = args.offers ?? [];

  const couponDiscount = args.coupon ? calculateCouponDiscount(subtotal, args.coupon) : 0;
  const eligibleOffers = offers
    .filter(offer => isActiveOffer(offer, now))
    .map(offer => ({ offer, discount: calculateOfferDiscount(subtotal, offer, isFirstOrder, now) }))
    .filter(x => x.discount > 0)
    .sort((a, b) => b.discount - a.discount);

  // Keep the existing checkout behavior predictable: coupon and promotional discount
  // do not stack. The larger eligible product discount wins.
  const bestOffer = eligibleOffers[0];
  const discount = Math.max(couponDiscount, bestOffer?.discount ?? 0);
  const couponWins = couponDiscount >= (bestOffer?.discount ?? 0) && couponDiscount > 0;
  const offerWins = !couponWins && Boolean(bestOffer);

  const freeByThreshold = args.shippingFreeAbove !== null
    && subtotal - discount >= args.shippingFreeAbove;
  const freeByOffer = hasFreeShippingOffer(offers, isFirstOrder, now);
  const freeShipping = freeByThreshold || freeByOffer;
  const shipping = freeShipping ? 0 : roundMoney(Math.max(0, args.shippingPrice));
  const total = roundMoney(Math.max(0, subtotal + shipping - discount));

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping,
    ...(couponWins ? { couponCode: args.coupon?.code } : {}),
    ...(offerWins ? { offerName: bestOffer?.offer.name } : {}),
  };
}
