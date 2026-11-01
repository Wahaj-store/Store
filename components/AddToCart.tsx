'use client';

import { useCallback, useRef, useState } from 'react';
import AddToCartButtonContent from './AddToCartButtonContent';
import ProductVariantPicker from './ProductVariantPicker';
import { mergeProductIntoCart } from '@/lib/cart-storage';

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const pickerUnavailable = hasVariants && !variants.some((item: any) => Number(item.stock) > 0);

  function add(targetVariantId?: string, quantityOverride?: number): boolean {
    const resolvedVariantId = variantId || targetVariantId;
    const requestedQuantity = Number(quantityOverride ?? product.selectedQuantity) || 1;
    let currentCart: unknown = [];
    try {
      const stored = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
      currentCart = Array.isArray(stored) ? stored : [];
    } catch {
      currentCart = [];
    }

    const cart = mergeProductIntoCart(currentCart, product, resolvedVariantId, requestedQuantity);
    if (!cart) return false;
    try {
      localStorage.setItem('wahaj_cart', JSON.stringify(cart));
    } catch {
      return false;
    }
    window.dispatchEvent(new Event('wahaj-cart-change'));
    window.dispatchEvent(new Event('storage'));

    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
    return true;
  }

  const selectedVariant = variantId
    ? variants.find((item: any) => item.id === variantId)
    : null;
  const disabled = hasVariants
    ? !variantId || !(selectedVariant?.stock)
    : !(Number(product.stock) > 0);
  const isDetail = variant === 'detail';

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  if (variant === 'card' && hasVariants && !variantId) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          disabled={pickerUnavailable}
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-live="polite"
          data-cart-state={done ? 'done' : pickerUnavailable ? 'disabled' : 'idle'}
          aria-label={done ? `تمت إضافة ${product.name} إلى السلة` : `اختاري خيارات ${product.name}`}
          className="wahaj-add-to-cart group relative flex min-h-[58px] w-full items-center justify-center overflow-hidden rounded-[22px] border border-(--gold) bg-(--gold) px-5 text-sm font-bold text-(--gold-contrast) shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_20%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--gold)_28%,transparent)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--gold) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 md:min-h-[62px] md:text-base"
        >
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full" />
          <AddToCartButtonContent idleLabel={pickerUnavailable ? 'نفد الخيار' : 'اختاري الخيارات'} iconMode="options" />
        </button>
        {pickerOpen ? (
          <ProductVariantPicker
            product={product}
            onClose={closePicker}
            onConfirm={(selectedId, quantity) => add(selectedId, quantity)}
          />
        ) : null}
      </>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => add()}
      aria-live="polite"
      aria-label={done ? 'تمت الإضافة إلى السلة' : 'أضيفي إلى السلة'}
      data-cart-state={done ? 'done' : disabled ? 'disabled' : 'idle'}
      className={[
        'wahaj-add-to-cart',
        'group relative w-full overflow-hidden font-bold transition-all duration-300',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--gold) focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-55',
        isDetail
          ? 'min-h-[54px] rounded-2xl px-6 text-sm md:min-h-[58px] md:text-base'
          : 'min-h-[58px] rounded-[22px] px-5 text-sm md:min-h-[62px] md:text-base',
        disabled
          ? 'border border-border bg-muted/40 text-muted-foreground shadow-none'
          : done
            ? 'wahaj-add-to-cart--success border border-(--gold) bg-(--gold-soft) text-(--foreground) shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_24%,transparent)]'
            : 'border border-(--gold) bg-(--gold) text-(--gold-contrast) shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_20%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--gold)_28%,transparent)] active:translate-y-0',
      ].join(' ')}
    >
      {!disabled && !done ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full"
        />
      ) : null}

      <AddToCartButtonContent idleLabel="أضيفي إلى السلة" />
    </button>
  );
}
