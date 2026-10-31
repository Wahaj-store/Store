export type CheckoutPreviewItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type CheckoutPreviewPayloadInput = {
  items: CheckoutPreviewItem[];
  giftCardCode?: string | null;
  governorate?: string | null;
  city?: string | null;
  phone?: string | null;
  giftWrap?: boolean;
};

export function buildCheckoutPreviewPayload(input: CheckoutPreviewPayloadInput) {
  return {
    items: input.items.map(({ productId, variantId, quantity }) => ({
      productId,
      ...(variantId ? { variantId } : {}),
      quantity,
    })),
    giftCardCode: input.giftCardCode?.trim() || undefined,
    governorate: input.governorate?.trim() || undefined,
    city: input.city?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    giftWrap: input.giftWrap === true,
  };
}

/** Compare money amounts at cent precision to avoid floating point noise. */
export function checkoutTotalsMatch(expected: number, actual: number): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  return Math.round((expected + Number.EPSILON) * 100) === Math.round((actual + Number.EPSILON) * 100);
}
