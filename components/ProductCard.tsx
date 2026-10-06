"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, Heart, ShoppingBag, X } from "lucide-react";
import AddToCart from "./AddToCart";
import WishlistButton from "./WishlistButton";

function QuickView({ p, onClose }: { p: any; onClose: () => void }) {
  const price = Number(p.price);
  const compare = p.comparePrice ? Number(p.comparePrice) : 0;

  return (
    <div
      className="wahaj-product-modal fixed inset-0 z-[80] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`عرض سريع: ${p.name}`}
      onClick={onClose}
    >
      <div
        className="wahaj-product-modal__panel w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق العرض السريع"
          className="wahaj-product-modal__close"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="wahaj-product-modal__image">
            <Image
              src={p.images?.[0]?.url || "/placeholder.svg"}
              alt={p.images?.[0]?.alt || p.name}
              width={900}
              height={1125}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>

          <div className="p-6 md:p-9 text-right">
            {p.category?.name && (
              <span className="text-[11px] font-bold tracking-[0.16em] text-[var(--gold)]">
                {p.category.name}
              </span>
            )}

            <h2 className="mt-2 text-2xl md:text-3xl font-semibold leading-tight">
              {p.name}
            </h2>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-[var(--gold)]">
                {price.toLocaleString("ar-EG")} ج.م
              </span>
              {compare > price && (
                <del className="text-sm text-[var(--muted-foreground)]">
                  {compare.toLocaleString("ar-EG")} ج.م
                </del>
              )}
            </div>

            <p className="mt-5 text-sm leading-8 text-[var(--muted-foreground)]">
              {p.description ||
                "قطعة مختارة بعناية من وَهَج، بتفاصيل تجمع بين الرقي واللمسة العصرية."}
            </p>

            <div className="mt-7 grid gap-3">
              <Link
                href={`/product/${p.slug}`}
                prefetch={false}
                className="wahaj-product-modal__details"
              >
                اكتشفي التفاصيل الكاملة
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-[var(--muted-foreground)] hover:text-foreground transition-colors py-2"
              >
                متابعة التصفح
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductCard({
  product,
  compact = false,
  variant = "default",
}: {
  product: any;
  compact?: boolean;
  variant?: "default" | "shop";
}) {
  const [quickView, setQuickView] = useState(false);
  const price = Number(product.price);
  const compare = product.comparePrice ? Number(product.comparePrice) : 0;
  const discount =
    compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const soldOut = Number(product.stock) <= 0;

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
              src={product.images?.[0]?.url || "/placeholder.svg"}
              alt={product.images?.[0]?.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="wahaj-product-card__image"
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

          <div className="wahaj-product-card__actions">
            <button
              type="button"
              onClick={() => setQuickView(true)}
              className="wahaj-product-card__action"
              aria-label={`نظرة سريعة على ${product.name}`}
            >
              <Eye size={16} />
              <span>نظرة سريعة</span>
            </button>
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

          {soldOut && (
            <div className="wahaj-product-card__soldout">نفدت الكمية</div>
          )}
        </div>

        <div className="wahaj-product-card__body">
          <div className="wahaj-product-card__category">
            {product.category?.name || "وَهَج"}
          </div>

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
                soldOut ? "is-out" : Number(product.stock) <= 5 ? "is-low" : ""
              }`}
            />
            {soldOut
              ? "غير متوفر حاليًا"
              : Number(product.stock) <= 5
                ? "متبقي عدد محدود"
                : "متوفر — جاهز للطلب"}
          </div>

          <div className="wahaj-product-card__cart">
            <AddToCart product={product} />
          </div>
        </div>
      </article>

      {quickView && (
        <QuickView p={product} onClose={() => setQuickView(false)} />
      )}
    </>
  );
}
