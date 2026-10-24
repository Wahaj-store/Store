'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import ProductVariantPicker from './ProductVariantPicker';

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
    if (hasVariants && !resolvedVariantId) return false;

    const selectedVariant = resolvedVariantId
      ? variants.find((item: any) => item.id === resolvedVariantId)
      : null;
    if (resolvedVariantId && !selectedVariant) return false;

    const available = Math.max(0, Number(selectedVariant ? selectedVariant.stock : product.stock) || 0);
    if (available <= 0) return false;

    const requestedQuantity = Number(quantityOverride ?? product.selectedQuantity) || 1;
    const selectedQty = Math.max(1, Math.floor(requestedQuantity));
    const price = selectedVariant?.price != null
      ? Number(selectedVariant.price)
      : Number(product.price);

    let cart: any[];
    try {
      const stored = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
      cart = Array.isArray(stored) ? stored : [];
    } catch {
      cart = [];
    }

    const key = `${product.id}:${selectedVariant?.id || ''}`;
    const index = cart.findIndex(
      (item: any) => `${item.productId}:${item.variantId || ''}` === key,
    );

    if (index >= 0) {
      cart[index].quantity = Math.min(
        (Number(cart[index].quantity) || 0) + selectedQty,
        available,
      );
      cart[index].maxStock = available;
      cart[index].price = price;
    } else {
      cart.push({
        productId: product.id,
        variantId: selectedVariant?.id || undefined,
        variantName: selectedVariant?.name,
        variantValue: selectedVariant?.value,
        name: product.name,
        price,
        image: selectedVariant?.imageUrl || product.images?.[0]?.url || '',
        quantity: Math.min(selectedQty, available),
        maxStock: available,
      });
    }

    localStorage.setItem('wahaj_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('wahaj-cart-change'));
    window.dispatchEvent(new Event('storage'));

    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
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
          aria-label={`اختاري خيارات ${product.name}`}
          className="group relative flex min-h-[58px] w-full items-center justify-center overflow-hidden rounded-[22px] border border-(--gold) bg-(--gold) px-5 text-sm font-bold text-(--gold-contrast) shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_20%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--gold)_28%,transparent)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--gold) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 md:min-h-[62px] md:text-base"
        >
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
            {done ? <Check size={19} strokeWidth={2.4} aria-hidden="true" /> : <SlidersHorizontal size={19} strokeWidth={2.1} aria-hidden="true" />}
            <span>{done ? 'تمت الإضافة بنجاح' : pickerUnavailable ? 'نفد الخيار' : 'اختاري الخيارات'}</span>
          </span>
        </button>
        {pickerOpen ? (
          <ProductVariantPicker
            product={product}
            onClose={closePicker}
            onConfirm={(selectedId, quantity) => {
              if (add(selectedId, quantity)) closePicker();
            }}
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
            ? 'border border-emerald-700/20 bg-emerald-600 text-white shadow-[0_10px_28px_rgba(5,150,105,0.20)]'
            : 'border border-(--gold) bg-(--gold) text-(--gold-contrast) shadow-[0_10px_28px_color-mix(in_srgb,var(--gold)_20%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--gold)_28%,transparent)] active:translate-y-0',
      ].join(' ')}
    >
      {!disabled && !done ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full"
        />
      ) : null}

      <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
        {done ? (
          <Check size={20} strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <ShoppingBag size={20} strokeWidth={2.1} aria-hidden="true" />
        )}
        <span>{done ? 'تمت الإضافة بنجاح' : 'أضيفي إلى السلة'}</span>
      </span>
    </button>
  );
}
