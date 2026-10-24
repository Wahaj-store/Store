'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Check, Minus, Plus, X } from 'lucide-react';
import AddToCartButtonContent from './AddToCartButtonContent';

type ProductVariant = {
  id: string;
  name: string;
  value: string;
  stock: number;
  price?: number | string | null;
  imageUrl?: string | null;
};

type ProductVariantPickerProps = {
  product: any;
  onClose: () => void;
  onConfirm: (variantId: string, quantity: number) => boolean;
};

export default function ProductVariantPicker({ product, onClose, onConfirm }: ProductVariantPickerProps) {
  const variants: ProductVariant[] = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const selected = variants.find((item) => item.id === selectedId);
  const selectedStock = Math.max(0, Number(selected?.stock) || 0);
  const selectedPrice = selected?.price != null ? Number(selected.price) : Number(product?.price) || 0;
  const imageUrl = selected?.imageUrl || product?.images?.[0]?.url;

  function confirmSelection() {
    if (!selected || selectedStock < 1 || added) return;
    if (onConfirm(selected.id, quantity)) {
      setAdded(true);
      closeTimerRef.current = window.setTimeout(onClose, 1650);
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="wahaj-variant-picker__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="wahaj-variant-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wahaj-variant-picker-title"
        dir="rtl"
      >
        <header className="wahaj-variant-picker__header">
          <div>
            <span className="wahaj-variant-picker__eyebrow">اختيار المنتج</span>
            <h2 id="wahaj-variant-picker-title">اختاري التفاصيل المناسبة</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="wahaj-variant-picker__close"
            onClick={onClose}
            aria-label="إغلاق نافذة اختيار المنتج"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="wahaj-variant-picker__product">
          {imageUrl ? (
            <div className="wahaj-variant-picker__image">
              <Image src={imageUrl} alt={product?.name || ''} fill sizes="72px" />
            </div>
          ) : null}
          <div className="wahaj-variant-picker__product-copy">
            <strong>{product?.name}</strong>
            <span className="wahaj-variant-picker__price">
              {selectedPrice.toLocaleString('ar-EG')} <small>ج.م</small>
            </span>
          </div>
        </div>

        <fieldset className="wahaj-variant-picker__fieldset">
          <legend>الخيارات المتاحة</legend>
          <div className="wahaj-variant-picker__options">
            {variants.map((item) => {
              const available = Number(item.stock) > 0;
              const active = selectedId === item.id;
              const itemPrice = item.price != null ? Number(item.price) : Number(product?.price) || 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`wahaj-variant-picker__option${active ? ' is-selected' : ''}`}
                  aria-pressed={active}
                  aria-label={`${item.name}: ${item.value}${available ? '' : '، غير متاح'}`}
                  disabled={!available}
                  onClick={() => {
                    setSelectedId(item.id);
                    setQuantity(1);
                  }}
                >
                  {item.imageUrl ? (
                    <span className="wahaj-variant-picker__option-image">
                      <Image src={item.imageUrl} alt="" fill sizes="48px" />
                    </span>
                  ) : null}
                  <span className="wahaj-variant-picker__option-copy">
                    <small>{item.name}</small>
                    <strong>{item.value}</strong>
                    {item.price != null ? <small>{itemPrice.toLocaleString('ar-EG')} ج.م</small> : null}
                  </span>
                  <span className="wahaj-variant-picker__option-state" aria-hidden="true">
                    {active ? <Check size={15} /> : null}
                  </span>
                  {!available ? <span className="wahaj-variant-picker__unavailable">نفد</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        {selected ? (
          <div className={`wahaj-variant-picker__stock${selectedStock <= 5 ? ' is-low' : ''}`} role="status">
            {selectedStock > 0
              ? selectedStock <= 5
                ? `متبقي ${selectedStock.toLocaleString('ar-EG')} فقط من ${selected.name}: ${selected.value}`
                : `متوفر — ${selected.name}: ${selected.value}`
              : 'هذا الخيار غير متاح حاليًا'}
          </div>
        ) : (
          <p className="wahaj-variant-picker__hint">اختاري خيارًا متاحًا للمتابعة إلى السلة.</p>
        )}

        <div className="wahaj-variant-picker__footer">
          <div className="wahaj-variant-picker__quantity" aria-label="اختيار الكمية">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={!selected || quantity <= 1}
              aria-label="تقليل الكمية"
            ><Minus size={16} /></button>
            <output aria-live="polite">{quantity.toLocaleString('ar-EG')}</output>
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.min(selectedStock, current + 1))}
              disabled={!selected || quantity >= selectedStock}
              aria-label="زيادة الكمية"
            ><Plus size={16} /></button>
          </div>
          <button
            type="button"
            className="wahaj-variant-picker__add wahaj-add-to-cart"
            disabled={!selected || selectedStock < 1 || added}
            aria-live="polite"
            aria-label={added ? 'تمت الإضافة إلى السلة' : 'أضيفي إلى السلة'}
            data-cart-state={added ? 'done' : !selected || selectedStock < 1 ? 'disabled' : 'idle'}
            onClick={confirmSelection}
          >
            <AddToCartButtonContent idleLabel="أضيفي إلى السلة" />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
