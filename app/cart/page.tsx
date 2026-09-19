'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus } from 'lucide-react';

export default function Cart() {
  const [c, setC] = useState<any[]>([]);
  const [free, setFree] = useState(0);
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    const sync = () => setC(JSON.parse(localStorage.getItem('wahaj_cart') || '[]'));
    sync();
    fetch('/api/settings')
      .then(x => x.json())
      .then(x => {
        const v = Number(x.settings?.free_shipping || 0);
        setFree(v > 0 ? v : 0);
      })
      .catch(() => {});
    window.addEventListener('wahaj-cart-change', sync);
    return () => window.removeEventListener('wahaj-cart-change', sync);
  }, []);

  function save(x: any[]) {
    setC(x);
    localStorage.setItem('wahaj_cart', JSON.stringify(x));
    window.dispatchEvent(new Event('wahaj-cart-change'));
  }

  const total = c.reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 0), 0);
  const progress = free ? Math.min(100, (total / free) * 100) : 0;
  const remain = Math.max(0, free - total);

  if (!c.length) {
    return (
      <main className="container py-20 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gold)]/10 grid place-items-center text-[var(--gold)]">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-semibold mb-2">سلة المشتريات فارغة</h2>
        <p className="muted text-sm mb-6">لم تقم بإضافة أي منتجات إلى سلتك حتى الآن.</p>
        <Link href="/shop" className="btn btn-gold inline-flex items-center gap-2">
          <ArrowRight size={18} /> اكتشفي المنتجات
        </Link>
      </main>
    );
  }

  return (
    <main className="container py-8 max-w-5xl">
      {/* زر متابعة التسوق الاحترافي أعلى الصفحة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-semibold">سلة المشتريات</h1>
        <Link 
          href="/shop" 
          className="border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white transition flex items-center gap-2 text-sm py-2 px-4 rounded-lg font-medium shadow-sm"
        >
          <ArrowRight size={16} /> متابعة التسوق
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* قائمة المنتجات */}
        <div className="grid gap-4">
          {c.map((x, i) => (
            <div 
              className="lux-card flex items-center gap-4 p-4 bg-background border hairline rounded-xl transition hover:shadow-md" 
              key={`${x.productId}:${x.variantId || i}`}
            >
              <img 
                src={x.image || '/placeholder.png'} 
                alt={x.name} 
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-md object-cover flex-shrink-0 bg-black/5" 
              />
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">{x.name}</h3>
                {x.variantValue && (
                  <p className="muted text-xs mb-1">{x.variantName}: {x.variantValue}</p>
                )}
                <p className="text-[var(--gold)] font-bold text-sm mb-3">
                  {Number(x.price).toLocaleString('ar-EG')} ج.م
                </p>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center border hairline rounded-md overflow-hidden bg-black/5">
                    <button 
                      aria-label="تقليل الكمية" 
                      className="px-3 py-1 hover:bg-black/10 transition text-sm" 
                      onClick={() => save(c.map((y, j) => (j === i ? { ...y, quantity: Math.max(1, y.quantity - 1) } : y)))}
                    >
                      <Minus size={14} />
                    </button>
                    <span aria-live="polite" className="px-3 text-sm font-medium">{x.quantity}</span>
                    <button 
                      aria-label="زيادة الكمية" 
                      className="px-3 py-1 hover:bg-black/10 transition text-sm" 
                      onClick={() => save(c.map((y, j) => (j === i ? { ...y, quantity: Math.min(y.quantity + 1, y.maxStock || 99) } : y)))}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button 
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs transition font-medium" 
                    onClick={() => save(c.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ملخص الطلب الجانبي */}
        <aside className="lux-card h-fit p-6 bg-background border hairline rounded-xl sticky top-24">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b hairline">ملخص الطلب</h2>

          {free > 0 && (
            <div className="mb-4 bg-black/5 p-3 rounded-lg">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span>{remain ? `أضيفي ${remain.toLocaleString('ar-EG')} ج.م للشحن المجاني` : 'تم الوصول للشحن المجاني 🎉'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full bg-[var(--gold)] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">كود الخصم</label>
            <input 
              value={coupon} 
              onChange={e => setCoupon(e.target.value.toUpperCase())} 
              className="input w-full" 
              placeholder="اختياري" 
              dir="ltr" 
            />
          </div>

          <div className="flex justify-between mb-6 text-base font-bold border-t hairline pt-4">
            <span>الإجمالي النهائي</span>
            <span className="text-[var(--gold)]">{total.toLocaleString('ar-EG')} ج.م</span>
          </div>

          <Link 
            href={coupon ? `/checkout?coupon=${encodeURIComponent(coupon)}` : '/checkout'} 
            className="btn btn-gold w-full text-center py-3 block rounded-lg font-medium shadow-md"
          >
            إتمام الطلب
          </Link>
        </aside>
      </div>
    </main>
  );
}
