'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Minus, Plus, Zap } from 'lucide-react';
import AddToCart from './AddToCart';

export default function ProductPurchase({ product }: { product: any }) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>(product.variants?.[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const selectedVariant = product.variants?.find((variant: any) => variant.id === id);
  const price = selectedVariant?.price != null ? Number(selectedVariant.price) : Number(product.price);
  const stock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleBuyNow = () => {
    try {
      setIsBuyingNow(true);
      router.push(`/cart?productId=${product.id}&variantId=${id || ''}&quantity=${quantity}`);
    } catch (error) {
      console.error(error);
      setIsBuyingNow(false);
    }
  };

  return (
    <div className="wahaj-product-purchase" dir="rtl">
      <div className="wahaj-product-purchase__price-row">
        <div>
          <span className="wahaj-product-purchase__price-label">السعر</span>
          <div className="wahaj-product-purchase__price-line">
            <strong>{price.toLocaleString('ar-EG')} <small>ج.م</small></strong>
            {product.comparePrice && Number(product.comparePrice) > price ? (
              <del>{Number(product.comparePrice).toLocaleString('ar-EG')} ج.م</del>
            ) : null}
          </div>
        </div>
        {product.comparePrice && Number(product.comparePrice) > price ? (
          <span className="wahaj-product-purchase__saving">
            وفرّي {Math.round((1 - price / Number(product.comparePrice)) * 100).toLocaleString('ar-EG')}٪
          </span>
        ) : null}
      </div>

      {product.variants?.length ? (
        <fieldset className="wahaj-product-variants">
          <legend>اختاري التفاصيل المناسبة</legend>
          <div className="wahaj-product-variants__list">
            {product.variants.map((variant: any) => (
              <button
                type="button"
                key={variant.id}
                disabled={!variant.stock}
                aria-pressed={id === variant.id}
                onClick={() => setId(variant.id)}
                className={`wahaj-product-variant ${id === variant.id ? 'is-selected' : ''}`}
              >
                <span>{variant.name}: {variant.value}</span>
                {variant.price != null ? <small>{Number(variant.price).toLocaleString('ar-EG')} ج.م</small> : null}
                {!variant.stock ? <span className="wahaj-product-variant__soldout">نفد</span> : null}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className={`wahaj-product-availability ${stock > 0 ? 'is-available' : 'is-unavailable'}`}>
        {stock > 0 ? <CheckCircle2 size={16} aria-hidden="true" /> : <span className="wahaj-product-availability__dot" aria-hidden="true" />}
        <span>{stock > 0 ? (stock <= 5 ? `متبقي ${stock} قطع فقط` : 'متوفر وجاهز للطلب') : 'غير متوفر حاليًا'}</span>
      </div>

      <div className="wahaj-product-purchase__actions">
        <div className="wahaj-product-purchase__add">
          <AddToCart
            product={{ ...product, selectedQuantity: quantity }}
            variantId={id}
            variant="detail"
          />
        </div>
        <div className="wahaj-product-quantity" aria-label="اختيار الكمية">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity <= 1}
            aria-label="تقليل الكمية"
          ><Minus size={15} /></button>
          <output aria-live="polite">{quantity.toLocaleString('ar-EG')}</output>
          <button
            type="button"
            onClick={() => setQuantity((current) => (stock && current < stock ? current + 1 : current))}
            disabled={!stock || quantity >= stock}
            aria-label="زيادة الكمية"
          ><Plus size={15} /></button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuyNow}
        disabled={stock <= 0 || isBuyingNow}
        className="wahaj-product-buy-now"
      >
        <Zap size={17} aria-hidden="true" />
        <span>{isBuyingNow ? 'جارٍ التحويل…' : 'اشتري الآن'}</span>
      </button>
    </div>
  );
}
