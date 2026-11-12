export function hasRequiredPaymentReference(
  proofRequired: boolean,
  reference: string | undefined,
): boolean {
  return !proofRequired || (typeof reference === 'string' && reference.trim().length > 0);
}
