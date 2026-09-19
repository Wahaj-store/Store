'use client';

import { useState } from 'react';
import AddToCart from './AddToCart';
import { CheckCircle2 } from 'lucide-react';

export default function ProductPurchase({ product }: { product: any }) {
  const [id, setId] = useState<string | undefined>(product.variants?.[0]?.id);
  const [quantity, setQuantity] = useState(1);
  
  const v = product.variants?.find((x: any) => x.id === id);
  const price = v?.price != null ? Number(v.price) : Number(product.price);
  const stock = v ? v.stock : product.stock;

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => (stock && prev < stock ? prev + 1 : prev));
  };

  return (
    <div className="flex flex-col items-end text-right w-full">
      {/* عرض السعر مع السعر القديم إن وجد */}
      <div className="mt-2 flex items-center justify-end gap-3 w-full">
        {product.comparePrice && Number(product.comparePrice) > price && (
          <del className="text-sm text-muted-foreground">
            {Number(product.comparePrice).toLocaleString('ar-EG')} ج.م
          </del>
        )}
        <span className="text-2xl md:text-3xl font-extrabold text-[#D4AF37]">
          {price.toLocaleString('ar-EG')} ج.م
        </span>
      </div>

      {/* خيارات المنتجات (إن وجدت) */}
      {product.variants?.length > 0 && (
        <div className="mt-6 w-full">
          <h2 className="text-sm font-semibold mb-3 text-right">الخيارات المتاحة</h2>
          <div className="flex flex-wrap gap-2 justify-end">
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

      {/* حالة توفر المخزون */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-medium w-full">
        {stock > 0 ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span>{stock <= 5 ? `متبقي القليل • ${stock} قطعة فقط` : `متوفر بالمخزون (${stock} قطعة متاحة)`}</span>
            <CheckCircle2 size={15} className="flex-shrink-0" />
          </div>
        ) : (
          <span className="text-rose-500 font-semibold">غير متوفر حالياً</span>
        )}
      </div>

      {/* عداد تحديد الكمية (+ / -) */}
      <div className="mt-6 flex items-center justify-between w-full rounded-2xl border border-border/40 bg-muted/10 p-3">
        <span className="text-sm font-medium">الكمية المطلوبة:</span>
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-[var(--bg)] p-1 shadow-2xs">
          <button
            type="button"
            onClick={handleDecrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30 text-sm font-bold transition-colors hover:bg-[#D4AF37] hover:text-black"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-bold">{quantity}</span>
          <button
            type="button"
            onClick={handleIncrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30 text-sm font-bold transition-colors hover:bg-[#D4AF37] hover:text-black"
          >
            +
          </button>
        </div>
      </div>

      {/* زر الإضافة للسلة (يمتمرير الكمية المختارة) */}
      <div className="mt-6 w-full">
        <AddToCart product={product} variantId={id} quantity={quantity} />
      </div>
    </div>
  );
}
