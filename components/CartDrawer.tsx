'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

export type DrawerCartItem = {
  productId?: string;
  variantId?: string;
  name?: string;
  image?: string;
  variantName?: string;
  variantValue?: string;
  price?: number;
  quantity?: number;
  maxStock?: number;
};

type CartDrawerProps = {
  closing: boolean;
  cartItems: DrawerCartItem[];
  drawerQuantity: number;
  drawerFreeShipping: number;
  drawerRemaining: number;
  drawerShippingProgress: number;
  drawerMoney: (amount: number) => string;
  close: () => void;
  saveCart: (next: DrawerCartItem[]) => void;
  updateQuantity: (index: number, delta: number) => void;
};

export default function CartDrawer({
  closing,
  cartItems,
  drawerQuantity,
  drawerFreeShipping,
  drawerRemaining,
  drawerShippingProgress,
  drawerMoney,
  close,
  saveCart,
  updateQuantity,
}: CartDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLElement>({ open: true, initialFocusRef: closeButtonRef, onEscape: close });

  return (
    <div className={`wahaj-cart-drawer-overlay${closing ? ' is-closing' : ''}`} role="presentation" onMouseDown={close}>
      <aside
        id="wahaj-cart-drawer"
        ref={dialogRef}
        className={`wahaj-cart-drawer${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wahaj-cart-drawer-title"
        tabIndex={-1}
        dir="rtl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="wahaj-cart-drawer__header">
          <div className="wahaj-cart-drawer__heading">
            <span className="wahaj-cart-drawer__brand"><ShoppingBag size={16} /> وَهَج</span>
            <h2 id="wahaj-cart-drawer-title">سلة مشترياتكِ</h2>
            <p>{drawerQuantity ? `${drawerQuantity} ${drawerQuantity === 1 ? 'قطعة مختارة' : 'قطع مختارة'}` : 'اختياراتكِ المفضّلة في مكان واحد'}</p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={close}
            aria-label="إغلاق السلة"
            className="wahaj-cart-drawer__close"
          ><X size={19} /></button>
        </header>

        <div className="wahaj-cart-drawer__body">
          {cartItems.length === 0 ? (
            <div className="wahaj-cart-drawer__empty">
              <span className="wahaj-cart-drawer__empty-icon"><ShoppingBag size={27} strokeWidth={1.6} /></span>
              <h3>سلتكِ فارغة حاليًا</h3>
              <p>ابدئي باكتشاف القطع التي اخترناها لكِ، وستجدينها هنا عند إضافتها.</p>
              <Link href="/shop" prefetch={false} onClick={close} className="wahaj-cart-drawer__shop-link">اكتشفي المتجر <ArrowLeft size={15} /></Link>
            </div>
          ) : (
            <>
              {drawerFreeShipping > 0 && (
                <section className="wahaj-cart-drawer__shipping" aria-label="تقدم الشحن المجاني">
                  <div><Truck size={16} /><span>{drawerRemaining ? `أضيفي منتجات بقيمة ${drawerMoney(drawerRemaining)} للشحن المجاني` : 'رائع! أصبح شحن طلبكِ مجانيًا'}</span></div>
                  <div className="wahaj-cart-drawer__progress" role="progressbar" aria-valuenow={Math.round(drawerShippingProgress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${drawerShippingProgress}%` }} /></div>
                </section>
              )}
              <div className="wahaj-cart-drawer__items-label"><span>اختياراتكِ</span><b>{drawerQuantity} {drawerQuantity === 1 ? 'قطعة' : 'قطع'}</b></div>
              <ul className="wahaj-cart-drawer__items">
                {cartItems.map((item, index) => (
                  <li key={`${item.productId}:${item.variantId || index}`} className="wahaj-cart-drawer__item">
                    <div className="wahaj-cart-drawer__image">
                      <img src={item.image || '/placeholder.svg'} alt={item.name || 'منتج من متجر وَهَج'} />
                    </div>
                    <div className="wahaj-cart-drawer__item-body">
                      <div className="wahaj-cart-drawer__item-top">
                        <div className="wahaj-cart-drawer__item-copy">
                          <h3>{item.name}</h3>
                          {item.variantValue && <p>{item.variantName || 'الخيار'}: {item.variantValue}</p>}
                          <span>{drawerMoney(Number(item.price || 0))}</span>
                        </div>
                        <button type="button" className="wahaj-cart-drawer__remove" onClick={() => saveCart(cartItems.filter((_, itemIndex) => itemIndex !== index))} aria-label={`حذف ${item.name} من السلة`} title="حذف المنتج"><Trash2 size={16} /></button>
                      </div>
                      <div className="wahaj-cart-drawer__item-bottom">
                        <div className="wahaj-cart-drawer__quantity" aria-label={`كمية ${item.name}`}>
                          <button type="button" onClick={() => updateQuantity(index, -1)} aria-label={`تقليل كمية ${item.name}`} disabled={Number(item.quantity || 1) <= 1}><Minus size={13} /></button>
                          <span aria-live="polite">{item.quantity || 1}</span>
                          <button type="button" onClick={() => updateQuantity(index, 1)} aria-label={`زيادة كمية ${item.name}`} disabled={Boolean(item.maxStock && Number(item.quantity || 0) >= Number(item.maxStock))}><Plus size={13} /></button>
                        </div>
                        <strong>{drawerMoney(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {cartItems.length > 0 && (
          <footer className="wahaj-cart-drawer__footer">
            <div className="wahaj-cart-drawer__subtotal"><span>الإجمالي المبدئي</span><strong>{drawerMoney(cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))}</strong></div>
            <p className="wahaj-cart-drawer__note"><ShieldCheck size={14} /> يتم احتساب الشحن والسعر النهائي عند مراجعة الطلب</p>
            <Link href="/checkout" prefetch={false} onClick={close} className="wahaj-cart-drawer__checkout">إتمام الطلب <ArrowLeft size={16} /></Link>
            <Link href="/cart" prefetch={false} onClick={close} className="wahaj-cart-drawer__review">مراجعة السلة كاملة</Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
