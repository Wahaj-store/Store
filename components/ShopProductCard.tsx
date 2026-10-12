import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import AddToCart from './AddToCart';
import WishlistButton from './WishlistButton';
import ShopQuickView from './ShopQuickView';
import type { ShopProduct } from '@/lib/shop-data';

export default function ShopProductCard({ product }: { product: ShopProduct }) {
  const price = Number(product.price);
  const compare = product.comparePrice ? Number(product.comparePrice) : 0;
  const discount = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const variantStock = product.variants?.[0]?.stock;
  const availableStock = product.variants?.length && variantStock != null
    ? Number(variantStock)
    : Number(product.stock);
  const soldOut = availableStock <= 0;

  return (
    <article className="wahaj-product-card wahaj-product-card--shop">
      <div className="wahaj-product-card__media">
        <Link
          href={`/product/${product.slug}`}
          prefetch={false}
          aria-label={`عرض ${product.name}`}
          className="block h-full"
        >
          <Image
            src={product.images?.[0]?.url || '/placeholder.svg'}
            alt={product.images?.[0]?.alt || product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="wahaj-product-card__image"
            loading="lazy"
          />
        </Link>

        <div className="wahaj-product-card__top">
          <WishlistButton productId={product.id} />
          {discount > 0 ? (
            <span className="wahaj-product-card__discount">خصم {discount}%</span>
          ) : product.newArrival ? (
            <span className="wahaj-product-card__shop-tag">وصل حديثًا</span>
          ) : product.bestSeller ? (
            <span className="wahaj-product-card__shop-tag">الأكثر طلبًا</span>
          ) : null}
        </div>

        <div className="wahaj-product-card__actions">
          <ShopQuickView product={product} />
          <Link
            href={`/product/${product.slug}`}
            prefetch={false}
            className="wahaj-product-card__action"
            aria-label={`تفاصيل ${product.name}`}
          >
            <ShoppingBag size={16} />
            <span>التفاصيل</span>
          </Link>
        </div>

        {soldOut ? <div className="wahaj-product-card__soldout">نفدت الكمية</div> : null}
      </div>

      <div className="wahaj-product-card__body">
        <div className="wahaj-product-card__category">{product.category?.name || 'وَهَج'}</div>
        <Link href={`/product/${product.slug}`} prefetch={false} className="block">
          <h3 className="wahaj-product-card__title">{product.name}</h3>
        </Link>

        <div className="wahaj-product-card__price-row">
          <span className="wahaj-product-card__price">{price.toLocaleString('ar-EG')} ج.م</span>
          {compare > price ? (
            <del className="wahaj-product-card__old-price">{compare.toLocaleString('ar-EG')} ج.م</del>
          ) : null}
        </div>

        <div className="wahaj-product-card__availability">
          <span className={`wahaj-product-card__dot ${soldOut ? 'is-out' : availableStock <= 5 ? 'is-low' : ''}`} />
          {soldOut ? 'غير متوفر حاليًا' : availableStock <= 5 ? 'متبقي عدد محدود' : 'متوفر — جاهز للطلب'}
        </div>

        <div className="wahaj-product-card__cart"><AddToCart product={product} /></div>
      </div>
    </article>
  );
}
