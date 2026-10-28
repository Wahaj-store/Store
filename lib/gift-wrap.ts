export type GiftWrapSelection = {
  selected: boolean;
  fee: number;
};

export function resolveGiftWrapSelection(
  requested: boolean,
  featureEnabled: boolean,
  configuredFee: unknown,
): GiftWrapSelection {
  const selected = requested && featureEnabled;
  const parsedFee = Number(configuredFee || 0);
  const fee = selected && Number.isFinite(parsedFee)
    ? Math.max(0, Math.min(100_000, parsedFee))
    : 0;

  return { selected, fee };
}

export function toGiftWrapOrderFields(selection: GiftWrapSelection) {
  return {
    giftWrapSelected: selection.selected,
    giftWrapFee: selection.selected ? selection.fee : 0,
  };
}

export function addGiftWrapFeeToTotal(baseTotal: number, selection: GiftWrapSelection) {
  return baseTotal + (selection.selected ? selection.fee : 0);
}
