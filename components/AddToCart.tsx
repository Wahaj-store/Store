'use client';

import { useState } from 'react';

export default function AddToCart({ product, variantId }: { product: any; variantId?: string }) {
  const [done, setDone] = useState(false);

  function add() {
    if (product.variants?.length && !variantId) return;

    const variant = variantId ? product.variants?.find((x: any) => x.id === variantId) : null;
    const available = variant ? variant.stock : product.stock;

    if (!available) return;

    const price = variant?.price != null ? Number(variant.price) : Number(product.price);
    const cart = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
    const key = variant ? `${product.id}:${variant.id}` : product.id;
    
    const i = cart.findIndex((x: any) => `${x.productId}:${x.variantId || ''}` === key);

    if (i >= 0) {
      cart[i].quantity = Math.min(cart[i].quantity + 1, available);
    } else {
      cart.push({
        productId: product.id,
        variantId: variant?.id || undefined,
        variantName: variant?.name,
        variantValue: variant?.value,
        name: product.name,
        price,
        image: variant?.imageUrl || product.images?.[0]?.url || '',
        quantity: 1,
        maxStock: available,
      });
    }

    localStorage.setItem('wahaj_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('wahaj-cart-change'));
    
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }

  const disabled = product.variants?.length 
    ? !variantId || !(product.variants?.find((x: any) => x.id === variantId)?.stock) 
    : !product.stock;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={add}
      aria-live="polite"
      style={{
        backgroundColor: disabled ? undefined : done ? '#059669' : '#D4AF37', // لون ذهبي متناسق ومضمون الظهور
        color: disabled ? undefined : '#000000', // نص أسود واضح على الخلفية الذهبية
      }}
      className={`w-full rounded-xl py-3.5 px-6 text-sm font-bold transition-all shadow-md ${
        disabled
          ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60 border border-zinc-700'
          : done
          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
          : 'hover:opacity-90 shadow-amber-500/20'
      }`}
    >
      {done
        ? 'تمت الإضافة بنجاح ✓'
        : product.variants?.length && !variantId
        ? 'الرجاء اختيار الخيارات أولاً'
        : 'أضيفي إلى السلة'}
    </button>
  );
}
