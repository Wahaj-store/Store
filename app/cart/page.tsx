'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck } from 'lucide-react';

type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  maxStock?: number;
  image?: string;
  variantName?: string;
  variantValue?: string;
};

const money = (value: number) => `${value.toLocaleString('ar-EG')} ج.م`;

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [freeShipping, setFreeShipping] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  useEffect(() => {
    const readCart = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
        setItems(Array.isArray(raw) ? raw : []);
      } catch {
        setItems([]);
      }
    };
    const syncAbandonedCart = () => {
      try {
        const latest = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
        fetch('/api/cart/abandoned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: Array.isArray(latest) ? latest : [] }),
        }).catch(() => {});
      } catch { /* local storage is optional */ }
    };

    readCart();
    syncAbandonedCart();
    fetch('/api/settings')
      .then(response => response.json())
      .then(data => {
        const threshold = Number(data?.settings?.free_shipping || 0);
        setFreeShipping(threshold > 0 ? threshold : 0);
      })
      .catch(() => {});

    window.addEventListener('wahaj-cart-change', readCart);
    window.addEventListener('wahaj-cart-change', syncAbandonedCart);
    return () => {
      window.removeEventListener('wahaj-cart-change', readCart);
      window.removeEventListener('wahaj-cart-change', syncAbandonedCart);
    };
  }, []);

  const saveCart = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem('wahaj_cart', JSON.stringify(next));
    window.dispatchEvent(new Event('wahaj-cart-change'));
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);
  const quantity = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);
  const progress = freeShipping ? Math.min(100, (subtotal / freeShipping) * 100) : 0;
  const remaining = Math.max(0, freeShipping - subtotal);

  const updateQuantity = (index: number, delta: number) => {
    saveCart(items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const maximum = Math.max(1, Number(item.maxStock || 99));
      return { ...item, quantity: Math.max(1, Math.min(maximum, Number(item.quantity || 1) + delta)) };
    }));
  };

  const removeItem = (index: number) => {
    const item = items[index];
    const key = `${item.productId}:${item.variantId || index}`;
    setRemovingKey(key);
    window.setTimeout(() => {
      saveCart(items.filter((_, itemIndex) => itemIndex !== index));
      setRemovingKey(null);
    }, 180);
  };

  if (!items.length) {
    return (
      <main className="wahaj-cart-page wahaj-cart-page--empty" dir="rtl">
        <div className="wahaj-cart-empty-card">
          <div className="wahaj-cart-empty-card__icon"><ShoppingBag size={34} strokeWidth={1.5} /></div>
          <span className="wahaj-commerce-kicker"><Sparkles size={14} /> وَهَج للأناقة</span>
          <h1>سلتكِ بانتظار اختياراتكِ</h1>
          <p>أضيفي القطع التي تحبينها إلى سلة واحدة، ثم أكملي طلبكِ بخطوات بسيطة وآمنة.</p>
          <Link href="/shop" className="wahaj-commerce-primary"><ArrowLeft size={17} /> اكتشفي المجموعة</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wahaj-cart-page" dir="rtl">
      <div className="wahaj-commerce-shell">
        <header className="wahaj-commerce-header">
          <div>
            <span className="wahaj-commerce-kicker"><Sparkles size={14} /> تجربة وَهَج</span>
            <h1>سلة المشتريات</h1>
            <p>راجعي اختياراتكِ قبل الانتقال إلى عنوان الشحن والدفع.</p>
          </div>
          <Link href="/shop" className="wahaj-commerce-ghost"><ArrowRight size={16} /> متابعة التسوق</Link>
        </header>

        <nav className="wahaj-order-steps" aria-label="مراحل الطلب">
          <div className="is-active"><b>01</b><span>السلة</span></div>
          <i />
          <div><b>02</b><span>الشحن والدفع</span></div>
          <i />
          <div><b>03</b><span>التأكيد</span></div>
        </nav>

        <div className="wahaj-cart-layout">
          <section className="wahaj-cart-list" aria-label="منتجات السلة">
            <div className="wahaj-section-heading">
              <div><span>اختياراتكِ الحالية</span><h2>تفاصيل السلة</h2></div>
              <strong>{quantity} {quantity === 1 ? 'قطعة' : 'قطع'}</strong>
            </div>

            {items.map((item, index) => {
              const key = `${item.productId}:${item.variantId || index}`;
              return (
                <article className={`wahaj-cart-product ${removingKey === key ? 'is-removing' : ''}`} key={key}>
                  <div className="wahaj-cart-product__image">
                    <Image src={item.image || '/placeholder.svg'} alt={item.name} width={132} height={156} sizes="(max-width: 700px) 92px, 132px" />
                  </div>
                  <div className="wahaj-cart-product__body">
                    <div className="wahaj-cart-product__topline">
                      <div>
                        <span className="wahaj-cart-product__eyebrow">قطعة مختارة</span>
                        <h3>{item.name}</h3>
                        {item.variantValue && <p>{item.variantName}: {item.variantValue}</p>}
                      </div>
                      <button type="button" className="wahaj-cart-remove" onClick={() => removeItem(index)} aria-label={`حذف ${item.name}`}><Trash2 size={16} /> حذف</button>
                    </div>
                    <div className="wahaj-cart-product__footer">
                      <span className="wahaj-price">{money(Number(item.price || 0))}</span>
                      <div className="wahaj-quantity-control" aria-label="تعديل الكمية">
                        <button type="button" onClick={() => updateQuantity(index, -1)} aria-label="تقليل الكمية" disabled={item.quantity <= 1}><Minus size={14} /></button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(index, 1)} aria-label="زيادة الكمية" disabled={Boolean(item.maxStock && item.quantity >= item.maxStock)}><Plus size={14} /></button>
                      </div>
                      <strong className="wahaj-cart-line-total">{money(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                    </div>
                  </div>
                </article>
              );
            })}

            <div className="wahaj-cart-benefits">
              <div><ShieldCheck size={18} /><span><b>دفع آمن</b><small>حماية لبياناتكِ في كل خطوة</small></span></div>
              <div><Truck size={18} /><span><b>توصيل موثوق</b><small>نحسب التكلفة بدقة في الخطوة التالية</small></span></div>
            </div>
          </section>

          <aside className="wahaj-cart-summary" aria-label="ملخص الطلب">
            <div className="wahaj-cart-summary__label">ملخص الطلب</div>
            <h2>جاهزة للخطوة التالية؟</h2>
            {freeShipping > 0 && <div className="wahaj-shipping-progress">
              <div className="wahaj-shipping-progress__copy"><span>{remaining ? `تبقى ${money(remaining)} للشحن المجاني` : 'وصلتِ للشحن المجاني'}</span><b>{Math.round(progress)}%</b></div>
              <div className="wahaj-shipping-progress__bar"><span style={{ width: `${progress}%` }} /></div>
            </div>}
            <label className="wahaj-cart-coupon"><span>كود الخصم أو الهدية</span><input value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} placeholder="اختياري" dir="ltr" /></label>
            <div className="wahaj-summary-lines"><div><span>عدد القطع</span><b>{quantity}</b></div><div><span>الإجمالي المبدئي</span><b>{money(subtotal)}</b></div><div><span>الشحن</span><b className="is-muted">يُحسب حسب العنوان</b></div></div>
            <div className="wahaj-summary-total"><span>الإجمالي الحالي</span><strong>{money(subtotal)}</strong></div>
            <Link href={coupon ? `/checkout?coupon=${encodeURIComponent(coupon)}` : '/checkout'} className="wahaj-commerce-primary wahaj-cart-summary__cta">تحديد عنوان الشحن <ArrowLeft size={17} /></Link>
            <p className="wahaj-summary-note"><ShieldCheck size={14} /> سيتم تأكيد السعر النهائي قبل إرسال الطلب</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
