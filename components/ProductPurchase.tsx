'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToCart from './AddToCart';
import { CheckCircle2, Zap } from 'lucide-react';

export default function ProductPurchase({ product }: { product: any }) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>(product.variants?.[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  
  const v = product.variants?.find((x: any) => x.id === id);
  const price = v?.price != null ? Number(v.price) : Number(product.price);
  const stock = v ? v.stock : product.stock;

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => (stock && prev < stock ? prev + 1 : prev));
  };

  const handleBuyNow = async () => {
    try {
      setIsBuyingNow(true);
      router.push(`/cart?productId=${product.id}&variantId=${id || ''}&quantity=${quantity}`);
    } catch (error) {
      console.error(error);
      setIsBuyingNow(false);
    }
  };

  return (
    <div className="flex flex-col items-end text-right w-full">
      {/* 1. السعر والسعر القديم في الجهة اليمنى تماماً */}
      <div className="mt-2 flex items-center justify-end gap-2 w-full flex-row-reverse">
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

      {/* 2. حالة توفر المخزون: العلامة الخضراء في بداية النص من جهة اليمين تماماً */}
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

      {/* 3. زر "أضيفي إلى السلة" في الجهة اليمنى تماماً، وبجواره الكمية في الجهة اليسرى */}
      <div className="mt-6 flex flex-row items-center gap-3 w-full">
        {/* زر الإضافة للسلة في الجهة اليمنى ويأخذ المساحة الكبرى */}
        <div className="flex-1 w-full">
          <AddToCart product={{ ...product, selectedQuantity: quantity }} variantId={id} />
        </div>

        {/* عداد الكمية (- و +) في الجهة اليسرى */}
        <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/10 p-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-[var(--bg)] p-1 shadow-2xs">
            <button
              type="button"
              onClick={handleDecrease}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30 text-xs font-bold transition-colors hover:bg-[#D4AF37] hover:text-black"
            >
              -
            </button>
            <span className="w-6 text-center text-xs font-bold">{quantity}</span>
            <button
              type="button"
              onClick={handleIncrease}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30 text-xs font-bold transition-colors hover:bg-[#D4AF37] hover:text-black"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 4. زر اشتري الآن أسفلهم */}
      <div className="mt-3 w-full">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={stock <= 0 || isBuyingNow}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#aa8c2c] text-black font-bold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Zap size={18} className="fill-black" />
          <span>{isBuyingNow ? "جاري التحويل..." : "اشتري الآن (دفع سريع)"}</span>
        </button>
      </div>
    </div>
  );
}
