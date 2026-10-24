"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";
import AddToCart from "./AddToCart";
import WishlistButton from "./WishlistButton";

function ProductCard({
  product,
  compact = false,
  variant = "default",
  imageSizes,
}: {
  product: any;
  compact?: boolean;
  variant?: "default" | "shop";
  imageSizes?: string;
}) {
  const imageUrl = product.images?.[0]?.url || "/placeholder.svg";
  const [imageSrc, setImageSrc] = useState(imageUrl);
  const price = Number(product.price);
  const compare = product.comparePrice ? Number(product.comparePrice) : 0;
  const discount =
    compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const firstVariantStock = product.variants?.[0]?.stock;
  const availableStock = product.variants?.length && firstVariantStock != null
    ? Number(firstVariantStock)
    : Number(product.stock);
  const soldOut = availableStock <= 0;

  return (
    <>
      <article className={`wahaj-product-card ${compact ? "wahaj-product-card--compact" : ""} ${variant === "shop" ? "wahaj-product-card--shop" : ""}`}>
        <div className="wahaj-product-card__media">
          <Link
            href={`/product/${product.slug}`}
            prefetch={false}
            aria-label={`عرض ${product.name}`}
            className="block h-full"
          >
              <Image
                src={imageSrc}
                alt={product.images?.[0]?.alt || product.name}
                fill
                sizes={imageSizes || "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                quality={78}
                className="wahaj-product-card__image"
                loading="lazy"
                onError={() => setImageSrc("/placeholder.svg")}
            />
          </Link>

          <div className="wahaj-product-card__top">
            <WishlistButton productId={product.id} />
            {discount > 0 && (
              <span className="wahaj-product-card__discount">خصم {discount}%</span>
            )}
            {discount === 0 && variant === "shop" && product.newArrival && (
              <span className="wahaj-product-card__shop-tag">وصل حديثًا</span>
            )}
            {discount === 0 && variant === "shop" && !product.newArrival && product.bestSeller && (
              <span className="wahaj-product-card__shop-tag">الأكثر طلبًا</span>
            )}
          </div>

          {soldOut && (
            <div className="wahaj-product-card__soldout">نفدت الكمية</div>
          )}
        </div>

        <div className="wahaj-product-card__body">
          <Link href={`/product/${product.slug}`} prefetch={false} className="block">
            <h3 className="wahaj-product-card__title">{product.name}</h3>
          </Link>

          <div className="wahaj-product-card__price-row">
            <span className="wahaj-product-card__price">
              {price.toLocaleString("ar-EG")} ج.م
            </span>
            {compare > price && (
              <del className="wahaj-product-card__old-price">
                {compare.toLocaleString("ar-EG")} ج.م
              </del>
            )}
          </div>

          <div className="wahaj-product-card__availability">
            <span
              className={`wahaj-product-card__dot ${
              soldOut ? "is-out" : availableStock <= 5 ? "is-low" : ""
              }`}
            />
            {soldOut
              ? "غير متوفر حاليًا"
              : availableStock <= 5
                ? "متبقي عدد محدود"
                : "متوفر — جاهز للطلب"}
          </div>

          <div className="wahaj-product-card__cart">
            <AddToCart product={product} />
          </div>
        </div>
      </article>

    </>
  );
}

export default memo(ProductCard);
