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

const MAX_LINES = 1_000;
const MAX_OFFERS = 1_000;
const MAX_QUANTITY_PER_LINE = 1_000_000;
const MAX_MONEY_CENTS = Number.MAX_SAFE_INTEGER;
const EPSILON = Number.EPSILON;

function invalidInput(label: string): never {
  throw new Error(`قيمة تسعير غير صالحة: ${label}`);
}

function assertMoney(value: unknown, label: string): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value * 100 > MAX_MONEY_CENTS
  ) {
    invalidInput(label);
  }
}

function moneyToCents(value: number, label: string): number {
  assertMoney(value, label);
  const cents = Math.round((value + EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) invalidInput(label);
  return cents;
}

function roundMoney(value: number): number {
  assertMoney(value, 'المبلغ');
  return moneyToCents(value, 'المبلغ') / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateLines(lines: PricingLine[]): void {
  if (!Array.isArray(lines) || lines.length > MAX_LINES) {
    invalidInput('قائمة المنتجات');
  }

  for (const line of lines) {
    if (
      !line ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > MAX_QUANTITY_PER_LINE
    ) {
      invalidInput('الكمية');
    }

    const unitPriceCents = moneyToCents(line.unitPrice, 'سعر الوحدة');
    const lineCents = unitPriceCents * line.quantity;
    if (!Number.isSafeInteger(lineCents) || lineCents > MAX_MONEY_CENTS) {
      invalidInput('إجمالي بند المنتج');
    }
  }
}

function validateNullableMoney(value: number | null, label: string): void {
  if (value !== null) assertMoney(value, label);
}

function validateNullablePositiveInteger(value: number | null, label: string): void {
  if (value !== null && (!Number.isSafeInteger(value) || value <= 0)) {
    invalidInput(label);
  }
}

function validateDate(value: Date | null, label: string): void {
  if (value !== null && (!(value instanceof Date) || !Number.isFinite(value.getTime()))) {
    invalidInput(label);
  }
}

function validateOffer(offer: OfferPricing): void {
  if (!offer || typeof offer !== 'object') invalidInput('العرض');
  if (typeof offer.id !== 'string' || !offer.id.trim()) invalidInput('معرف العرض');
  if (typeof offer.name !== 'string' || !offer.name.trim()) invalidInput('اسم العرض');
  if (!(Object.values(OfferType) as unknown[]).includes(offer.type)) invalidInput('نوع العرض');
  if (!(Object.values(DiscountType) as unknown[]).includes(offer.discountType)) invalidInput('نوع الخصم');
  if (typeof offer.active !== 'boolean' || typeof offer.stackable !== 'boolean') {
    invalidInput('حالة العرض');
  }
  if (!Number.isFinite(offer.priority)) invalidInput('أولوية العرض');
  if (!Number.isSafeInteger(offer.usedCount) || offer.usedCount < 0) {
    invalidInput('عدد مرات استخدام العرض');
  }
  if (offer.maxUses !== null && (!Number.isSafeInteger(offer.maxUses) || offer.maxUses < 0)) {
    invalidInput('الحد الأقصى لاستخدام العرض');
  }

  validateNullableMoney(offer.discountValue, 'قيمة الخصم');
  validateNullableMoney(offer.minOrder, 'الحد الأدنى للطلب');
  validateNullableMoney(offer.maxDiscount, 'الحد الأقصى للخصم');

  if (
    offer.discountType === DiscountType.PERCENTAGE &&
    offer.discountValue !== null &&
    offer.discountValue > 100
  ) {
    invalidInput('نسبة الخصم');
  }

  if (offer.buyQuantity !== null && (!Number.isSafeInteger(offer.buyQuantity) || offer.buyQuantity <= 0)) {
    invalidInput('كمية الشراء في العرض');
  }
  if (offer.getQuantity !== null && (!Number.isSafeInteger(offer.getQuantity) || offer.getQuantity <= 0)) {
    invalidInput('كمية الهدية في العرض');
  }
  if (
    offer.getDiscountPercent !== null &&
    (!Number.isFinite(offer.getDiscountPercent) || offer.getDiscountPercent < 0 || offer.getDiscountPercent > 100)
  ) {
    invalidInput('نسبة خصم الكمية المجانية');
  }
  if (
    offer.type === OfferType.BUY_X_GET_Y &&
    (offer.buyQuantity === null || offer.getQuantity === null)
  ) {
    invalidInput('بيانات عرض اشترِ واحصل على');
  }

  validateDate(offer.startsAt, 'تاريخ بداية العرض');
  validateDate(offer.endsAt, 'تاريخ نهاية العرض');
  if (offer.startsAt && offer.endsAt && offer.startsAt > offer.endsAt) {
    invalidInput('فترة العرض');
  }

  if (
    !Array.isArray(offer.segmentKeys) ||
    offer.segmentKeys.some((key) => typeof key !== 'string')
  ) {
    invalidInput('شرائح العملاء المستهدفة');
  }
  if (offer.productId !== null && typeof offer.productId !== 'string') invalidInput('المنتج المستهدف');
  if (offer.categoryId !== null && typeof offer.categoryId !== 'string') invalidInput('الفئة المستهدفة');
}

function validateOffers(offers: OfferPricing[]): void {
  if (!Array.isArray(offers) || offers.length > MAX_OFFERS) {
    invalidInput('قائمة العروض');
  }
  for (const offer of offers) validateOffer(offer);
}

function validateNow(now: Date): void {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    invalidInput('التاريخ الحالي');
  }
}

export function calculateSubtotal(lines: PricingLine[]): number {
  validateLines(lines);

  const cents = lines.reduce((sum, line) => {
    const lineCents = moneyToCents(line.unitPrice, 'سعر الوحدة') * line.quantity;
    const total = sum + lineCents;
    if (!Number.isSafeInteger(total) || total > MAX_MONEY_CENTS) {
      invalidInput('المجموع الفرعي');
    }
    return total;
  }, 0);

  return cents / 100;
}

function isActiveOffer(offer: OfferPricing, now: Date): boolean {
  return offer.active &&
    (!offer.startsAt || offer.startsAt <= now) &&
    (!offer.endsAt || offer.endsAt >= now) &&
    (offer.maxUses === null || offer.usedCount < offer.maxUses);
}

function targetsCustomer(offer: OfferPricing, customerSegmentKey: string | null): boolean {
  if (offer.segmentKeys.length === 0) return true;
  return customerSegmentKey !== null && offer.segmentKeys.includes(customerSegmentKey);
}

function targetsLine(offer: OfferPricing, line: PricingLine): boolean {
  if (offer.productId && offer.productId !== line.productId) return false;
  if (offer.categoryId && offer.categoryId !== line.categoryId) return false;
  return true;
}

function percentageOrFixed(base: number, type: DiscountType, value: number | null): number {
  if (value === null) return 0;
  const raw = type === DiscountType.PERCENTAGE
    ? base * (clamp(value, 0, 100) / 100)
    : value;
  return roundMoney(Math.min(base, Math.max(0, raw)));
}

function eligibleBase(lines: PricingLine[], offer: OfferPricing): number {
  const cents = lines
    .filter((line) => targetsLine(offer, line))
    .reduce((sum, line) => {
      const next = sum + moneyToCents(line.unitPrice, 'سعر الوحدة') * line.quantity;
      if (!Number.isSafeInteger(next) || next > MAX_MONEY_CENTS) {
        invalidInput('أساس الخصم');
      }
      return next;
    }, 0);

  return cents / 100;
}

function calculateOfferDiscount(
  subtotal: number,
  lines: PricingLine[],
  offer: OfferPricing,
  isFirstOrder: boolean,
  customerSegmentKey: string | null,
  now: Date,
): number {
  if (
    !isActiveOffer(offer, now) ||
    !targetsCustomer(offer, customerSegmentKey) ||
    (offer.minOrder !== null && subtotal < offer.minOrder)
  ) {
    return 0;
  }
  if (offer.type === OfferType.FREE_SHIPPING) return 0;
  if (offer.type === OfferType.FIRST_ORDER && !isFirstOrder) return 0;

  const base = eligibleBase(lines, offer);
  if (base <= 0) return 0;

  let discount = 0;
  if (offer.type === OfferType.BUY_X_GET_Y) {
    const buy = offer.buyQuantity;
    const get = offer.getQuantity;
    if (buy === null || get === null) invalidInput('بيانات عرض اشترِ واحصل على');

    const eligibleLines = lines.filter((line) => targetsLine(offer, line));
    const totalQuantity = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);
    const sets = Math.floor(totalQuantity / (buy + get));
    if (sets <= 0) return 0;

    let freeUnits = sets * get;
    const sorted = [...eligibleLines].sort((a, b) => a.unitPrice - b.unitPrice);
    const percentage = (offer.getDiscountPercent ?? 100) / 100;

    for (const line of sorted) {
      if (freeUnits <= 0) break;
      const quantity = Math.min(freeUnits, line.quantity);
      discount += line.unitPrice * quantity * percentage;
      freeUnits -= quantity;
    }
  } else {
    discount = percentageOrFixed(base, offer.discountType, offer.discountValue);
  }

  if (offer.maxDiscount !== null) {
    discount = Math.min(discount, offer.maxDiscount);
  }

  return roundMoney(Math.min(base, Math.max(0, discount)));
}

export function hasFreeShippingOffer(
  offers: OfferPricing[],
  _isFirstOrder: boolean,
  now = new Date(),
  customerSegmentKey: string | null = null,
): boolean {
  validateOffers(offers);
  validateNow(now);

  if (customerSegmentKey !== null && typeof customerSegmentKey !== 'string') {
    invalidInput('شريحة العميل');
  }

  return offers.some((offer) =>
    isActiveOffer(offer, now) &&
    targetsCustomer(offer, customerSegmentKey) &&
    offer.type === OfferType.FREE_SHIPPING,
  );
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
  if (!args || typeof args !== 'object') invalidInput('مدخلات التسعير');

  validateLines(args.lines);
  assertMoney(args.shippingPrice, 'تكلفة الشحن');
  validateNullableMoney(args.shippingFreeAbove, 'حد الشحن المجاني');

  const now = args.now ?? new Date();
  validateNow(now);

  const isFirstOrder = args.isFirstOrder ?? false;
  if (typeof isFirstOrder !== 'boolean') invalidInput('حالة أول طلب');

  const customerSegmentKey = args.customerSegmentKey ?? null;
  if (customerSegmentKey !== null && typeof customerSegmentKey !== 'string') {
    invalidInput('شريحة العميل');
  }

  const offers = args.offers ?? [];
  validateOffers(offers);

  const subtotal = calculateSubtotal(args.lines);
  const eligible = offers
    .filter((offer) => isActiveOffer(offer, now))
    .map((offer) => ({
      offer,
      discount: calculateOfferDiscount(
        subtotal,
        args.lines,
        offer,
        isFirstOrder,
        customerSegmentKey,
        now,
      ),
    }))
    .filter((entry) => entry.discount > 0)
    .sort((a, b) => b.offer.priority - a.offer.priority || b.discount - a.discount);

  const stackable = eligible.filter((entry) => entry.offer.stackable);
  const nonStackable = eligible.filter((entry) => !entry.offer.stackable);
  const selected = stackable.length > 0 ? stackable : nonStackable.slice(0, 1);

  const discountCents = Math.min(
    moneyToCents(subtotal, 'المجموع الفرعي'),
    selected.reduce(
      (sum, entry) => Math.min(
        moneyToCents(subtotal, 'المجموع الفرعي'),
        sum + moneyToCents(entry.discount, 'الخصم'),
      ),
      0,
    ),
  );
  if (!Number.isSafeInteger(discountCents)) invalidInput('إجمالي الخصم');

  const discount = discountCents / 100;
  const appliedOffers: AppliedOffer[] = selected.map((entry) => ({
    id: entry.offer.id,
    name: entry.offer.name,
    discount: entry.discount,
  }));

  const freeByThreshold =
    args.shippingFreeAbove !== null && subtotal - discount >= args.shippingFreeAbove;

  const freeShippingOffer = offers
    .filter((offer) =>
      isActiveOffer(offer, now) &&
      targetsCustomer(offer, customerSegmentKey) &&
      offer.type === OfferType.FREE_SHIPPING,
    )
    .filter((offer) => offer.minOrder === null || subtotal >= offer.minOrder)
    .filter((offer) => eligibleBase(args.lines, offer) > 0)
    .sort((a, b) => b.priority - a.priority)[0];

  const freeShipping = freeByThreshold || Boolean(freeShippingOffer);
  const shipping = freeShipping ? 0 : roundMoney(args.shippingPrice);
  const total = roundMoney(Math.max(0, subtotal + shipping - discount));
  const finalAppliedOffers = [...appliedOffers];

  if (freeShippingOffer && !finalAppliedOffers.some((entry) => entry.id === freeShippingOffer.id)) {
    finalAppliedOffers.push({
      id: freeShippingOffer.id,
      name: freeShippingOffer.name,
      discount: 0,
    });
  }

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping,
    appliedOffers: finalAppliedOffers,
    ...(finalAppliedOffers.length
      ? { offerName: finalAppliedOffers.map((entry) => entry.name).join(' + ') }
      : {}),
  };
}
