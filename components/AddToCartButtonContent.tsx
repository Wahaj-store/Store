import { Check, ShoppingBag, ShoppingCart, SlidersHorizontal } from 'lucide-react';

type AddToCartButtonContentProps = {
  idleLabel: string;
  iconMode?: 'bag' | 'options';
};

export default function AddToCartButtonContent({
  done,
  idleLabel,
  iconMode = 'bag',
}: AddToCartButtonContentProps) {
  const IdleIcon = iconMode === 'options' ? SlidersHorizontal : ShoppingBag;

  return (
    <span className="wahaj-add-to-cart__content relative z-10 inline-flex items-center justify-center gap-2.5" aria-hidden="true">
      <span className="wahaj-add-to-cart__icon">
        <IdleIcon className="wahaj-add-to-cart__icon-idle" size={20} strokeWidth={2.1} />
        <span className="wahaj-add-to-cart__icon-success">
          <ShoppingCart size={20} strokeWidth={2.1} />
          <span className="wahaj-add-to-cart__check-badge"><Check size={9} strokeWidth={3} /></span>
        </span>
      </span>
      <span className="wahaj-add-to-cart__labels">
        <span className="wahaj-add-to-cart__label-idle">{idleLabel}</span>
        <span className="wahaj-add-to-cart__label-done">تمت الإضافة بنجاح</span>
      </span>
    </span>
  );
}
