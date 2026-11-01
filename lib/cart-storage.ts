export type CartVariantInput = {
  id: string;
  name?: string | null;
  value?: string | null;
  price?: number | string | null;
  stock: number | string;
  imageUrl?: string | null;
};

export type CartProductInput = {
  id: string;
  name: string;
  price: number | string;
  stock: number | string;
  images?: Array<string | { url?: string | null }>;
  variants?: CartVariantInput[];
};

export type StoredCartItem = {
  productId: string;
  variantId?: string;
  variantName?: string;
  variantValue?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  maxStock: number;
  [key: string]: unknown;
};

/** Merge one validated product choice into the existing cart without mutating it. */
export function mergeProductIntoCart(
  currentCart: unknown,
  product: CartProductInput,
  variantId?: string,
  requestedQuantity = 1,
): StoredCartItem[] | null {
  if (!product || typeof product.id !== 'string' || !product.id.trim() || typeof product.name !== 'string') {
    return null;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0 && !variantId) return null;
  if (variantId && variants.length === 0) return null;

  const selectedVariant = variantId ? variants.find((variant) => variant.id === variantId) : undefined;
  if (variantId && !selectedVariant) return null;

  const rawStock = selectedVariant ? selectedVariant.stock : product.stock;
  const stock = Number(rawStock);
  if (!Number.isFinite(stock) || stock <= 0) return null;
  const maxStock = Math.floor(stock);
  if (maxStock < 1) return null;

  const rawPrice = selectedVariant?.price != null ? selectedVariant.price : product.price;
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price < 0) return null;

  const requested = Number(requestedQuantity);
  const safeRequested = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 1;
  const quantity = Math.min(safeRequested, maxStock);
  const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;
  const firstImageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  const image = selectedVariant?.imageUrl || firstImageUrl || '';

  const validItems = Array.isArray(currentCart)
    ? currentCart.filter((item): item is StoredCartItem =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item) && typeof (item as StoredCartItem).productId === 'string',
      )
    : [];
  const nextCart = [...validItems];
  const key = `${product.id}:${selectedVariant?.id || ''}`;
  const existingIndex = nextCart.findIndex((item) => `${item.productId}:${item.variantId || ''}` === key);

  if (existingIndex >= 0) {
    const existing = nextCart[existingIndex];
    nextCart[existingIndex] = {
      ...existing,
      quantity: Math.min(Math.max(0, Number(existing.quantity) || 0) + quantity, maxStock),
      maxStock,
      price,
    };
  } else {
    nextCart.push({
      productId: product.id,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name || undefined,
      variantValue: selectedVariant?.value || undefined,
      name: product.name,
      price,
      image,
      quantity,
      maxStock,
    });
  }

  return nextCart;
}
