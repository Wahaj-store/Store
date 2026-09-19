'use client';

import { useState } from 'react';
import AddToCart from './AddToCart';

export default function ProductPurchase({ product }: { product: any }) {
  const [id, setId] = useState<string | undefined>(product.variants?.[0]?.id);
  const v = product.variants?.find((x: any) => x.id === id);
  const price = v?.price != null ? Number(v.price) : Number(product.price);
  const stock = v ? v.stock : product.stock;

  return (
    <div className="flex flex-col">
      {/* عرض السعر مع السعر القديم إن وجد */}
      <div className="mt-5 flex items-center gap-3">
        <span className="text-2xl font-bold text-[var(--brand-gold)]">
          {price.toLocaleString('ar-EG')} ج.م
        </span>
        {product.comparePrice && (
          <del className="text-sm text-muted-foreground">
            {Number(product.comparePrice).toLocaleString('ar-EG')} ج.م
          </del>
        )}
      </div>

      {/* خيارات المنتجات (إن وجدت) */}
      {product.variants?.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3">الخيارات المتاحة</h2>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((x: any) => (
              <button
                type="button"
                key={x.id}
                disabled={!x.stock}
                onClick={() => setId(x.id)}
                className={`rounded-xl border px-4 py-2 text-xs font-medium transition-all ${
                  id === x.id
                    ? 'border-[var(--brand-gold)] bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] shadow-sm'
                    : 'border-border/60 bg-[var(--bg)] text-foreground/80 hover:border-[var(--brand-gold)]/50'
                }`}
              >
                {x.name}: {x.value}
                {x.price != null ? ` • ${Number(x.price).toLocaleString('ar-EG')} ج.م` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* حالة توفر المخزون */}
      <div className="mt-5 text-xs font-medium">
        {stock > 0 ? (
          <span className={stock <= 5 ? 'text-amber-500 font-semibold' : 'text-emerald-500'}>
            {stock <= 5 ? `متبقي القليل • ${stock} قطعة فقط` : `متوفر بالمخزون • ${stock} قطعة`}
          </span>
        ) : (
          <span className="text-rose-500 font-semibold">غير متوفر حالياً</span>
        )}
      </div>

      {/* زر الإضافة للسلة */}
      <div className="mt-7">
        <AddToCart product={product} variantId={id} />
      </div>
    </div>
  );
}
