'use client';

import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { useFeatureFlags } from '@/lib/use-feature-flags';
import type { ShopProduct } from '@/lib/shop-data';

export default function ShopQuickView({ product }: { product: ShopProduct }) {
  const [open, setOpen] = useState(false);
  const { flags } = useFeatureFlags();
  if (!flags.quick_view) return null;

  const price = Number(product.price);
  const compare = product.comparePrice ? Number(product.comparePrice) : 0;
  const dialog = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="wahaj-product-modal fixed inset-0 z-80 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`عرض سريع: ${product.name}`}
          onClick={() => setOpen(false)}
        >
          <div className="wahaj-product-modal__panel w-full max-w-3xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق العرض السريع" className="wahaj-product-modal__close">
              <X size={18} />
            </button>
            <div className="grid md:grid-cols-2">
              <div className="wahaj-product-modal__image">
                <Image
                  src={product.images?.[0]?.url || '/placeholder.svg'}
                  alt={product.images?.[0]?.alt || product.name}
                  width={900}
                  height={1125}
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 450px"
                  loading="lazy"
                />
              </div>
              <div className="p-6 text-right md:p-9">
                {product.category?.name ? <span className="text-[11px] font-bold tracking-[0.16em] text-(--gold)">{product.category.name}</span> : null}
                <h2 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">{product.name}</h2>
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-(--gold)">{price.toLocaleString('ar-EG')} ج.م</span>
                  {compare > price ? <del className="text-sm text-(--muted-foreground)">{compare.toLocaleString('ar-EG')} ج.م</del> : null}
                </div>
                <p className="mt-5 text-sm leading-8 text-(--muted-foreground)">
                  {product.description || 'قطعة مختارة بعناية من وَهَج، بتفاصيل تجمع بين الرقي واللمسة العصرية.'}
                </p>
                <div className="mt-7 grid gap-3">
                  <Link href={`/product/${product.slug}`} prefetch={false} className="wahaj-product-modal__details">اكتشفي التفاصيل الكاملة</Link>
                  <button type="button" onClick={() => setOpen(false)} className="py-2 text-sm text-(--muted-foreground) transition-colors hover:text-foreground">متابعة التصفح</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="wahaj-product-card__action" aria-label={`نظرة سريعة على ${product.name}`}>
        <Eye size={16} />
        <span>نظرة سريعة</span>
      </button>
      {dialog}
    </>
  );
}
