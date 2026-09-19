'use client';

import { useState } from 'react';
import AddToCart from './AddToCart';
import { CheckCircle2 } from 'lucide-react';

export default function ProductPurchase({ product }: { product: any }) {
  const [id, setId] = useState<string | undefined>(product.variants?.[0]?.id);
  const v = product.variants?.find((x: any) => x.id === id);
  const price = v?.price != null ? Number(v.price) : Number(product.price);
  const stock = v ? v.stock : product.stock;

  return (
    <div className="flex flex-col">
      {/* عرض السعر مع السعر القديم إن وجد */}
      <div className="mt-2 flex items-center gap-3">
        <span className="text-2xl md:text-3xl font-extrabold text-[#D4AF37]">
          {price.toLocaleString('ar-EG')} ج.م
        </span>
        {product.comparePrice && Number(product.comparePrice) > price && (
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
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-sm'
                    : 'border-border/60 bg-[var(--bg)] text-foreground/80 hover:border-[#D4AF37]/50'
                }`}
              >
                {x.name}: {x.value}
                {x.price != null ? ` • ${Number(x.price).toLocaleString('ar-EG')} ج.م` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* حالة توفر المخزون مع العلامة الخضراء في جهة اليمين */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-medium">
        {stock > 0 ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span>{stock <= 5 ? `متبقي القليل • ${stock} قطعة فقط` : `متوفر بالمخزون (${stock} قطعة متاحة)`}</span>
            <CheckCircle2 size={15} />
          </div>
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
