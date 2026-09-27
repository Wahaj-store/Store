'use client';

import { useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';

type AddToCartProps = {
  product: any;
  variantId?: string;
  variant?: 'card' | 'detail';
};

export default function AddToCart({
  product,
  variantId,
  variant = 'card',
}: AddToCartProps) {
  const [done, setDone] = useState(false);

  function add() {
    if (product.variants?.length && !variantId) return;

    const selectedVariant = variantId
      ? product.variants?.find((x: any) => x.id === variantId)
      : null;
    const available = selectedVariant ? selectedVariant.stock : product.stock;

    if (!available) return;

    const selectedQty = Number(product.selectedQuantity) || 1;
    const price =
      selectedVariant?.price != null
        ? Number(selectedVariant.price)
        : Number(product.price);
    const cart = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
    const key = selectedVariant
      ? `${product.id}:${selectedVariant.id}`
      : product.id;

    const i = cart.findIndex(
      (x: any) => `${x.productId}:${x.variantId || ''}` === key,
    );

    if (i >= 0) {
      cart[i].quantity = Math.min(
        cart[i].quantity + selectedQty,
        available,
      );
    } else {
      cart.push({
        productId: product.id,
        variantId: selectedVariant?.id || undefined,
        variantName: selectedVariant?.name,
        variantValue: selectedVariant?.value,
        name: product.name,
        price,
        image:
          selectedVariant?.imageUrl || product.images?.[0]?.url || '',
        quantity: selectedQty,
        maxStock: available,
      });
    }

    localStorage.setItem('wahaj_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('wahaj-cart-change'));
    window.dispatchEvent(new Event('storage'));

    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }

  const disabled = product.variants?.length
    ? !variantId ||
      !(product.variants?.find((x: any) => x.id === variantId)?.stock)
    : !product.stock;

  const isDetail = variant === 'detail';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={add}
      aria-live="polite"
      className={[
        'group relative w-full overflow-hidden font-bold transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-55',
        isDetail
          ? 'min-h-[54px] rounded-2xl px-6 text-sm md:min-h-[58px] md:text-base'
          : 'min-h-[58px] rounded-[22px] px-5 text-sm md:min-h-[62px] md:text-base',
        disabled
          ? 'border border-border bg-muted/40 text-muted-foreground shadow-none'
          : done
            ? 'border border-emerald-700/20 bg-emerald-600 text-white shadow-[0_10px_28px_rgba(5,150,105,0.20)]'
            : 'border border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-contrast)] shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_20%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--gold)_28%,transparent)] active:translate-y-0',
      ].join(' ')}
    >
      {!disabled && !done && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full"
        />
      )}

      <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
        {done ? (
          <Check size={20} strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <ShoppingBag size={20} strokeWidth={2.1} aria-hidden="true" />
        )}

        <span>
          {done
            ? 'تمت الإضافة بنجاح'
            : product.variants?.length && !variantId
              ? 'اختاري الخيار أولاً'
              : 'أضيفي إلى السلة'}
        </span>
      </span>
    </button>
  );
}
