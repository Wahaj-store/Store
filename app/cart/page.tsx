'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';

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
      <main className="min-h-screen py-16 px-4 bg-background text-foreground transition-colors duration-300 flex items-center justify-center" dir="rtl">
        <div className="container max-w-md mx-auto text-center space-y-6 bg-card border border-border/60 rounded-3xl p-8 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 flex items-center justify-center shadow-inner">
            <ShoppingBag size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">سلة المشتريات فارغة</h2>
            <p className="text-muted-foreground text-sm">لم تقمي بإضافة أي منتجات إلى سلتك حتى الآن.</p>
          </div>
          <Link href="/shop" className="w-full py-3.5 rounded-xl bg-[var(--gold)] text-black font-bold text-sm shadow-md hover:opacity-95 transition inline-flex items-center justify-center gap-2">
            <ArrowRight size={18} /> اكتشفي المنتجات الآن
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-5xl mx-auto space-y-8">
        
        {/* الترويسة العليا */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <span className="text-[var(--gold)] font-medium text-sm flex items-center gap-1.5">
              <Sparkles size={16} /> متجر وَهَج للأناقة
            </span>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">سلة المشتريات</h1>
          </div>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 text-foreground hover:border-[var(--gold)]/50 transition text-sm font-semibold shadow-sm"
          >
            <ArrowRight size={16} /> متابعة التسوق
          </Link>
        </div>

        {/* مؤشر خطوات الطلب التفاعلي (Checkout Progress Bar) */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-card border border-border/60 rounded-2xl shadow-sm">
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-[var(--gold)] text-black shadow-md">
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">1</span>
            <span>مراجعة السلة</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">2</span>
            <span>بيانات الشحن</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">3</span>
            <span>تأكيد الطلب</span>
          </div>
        </div>

        {/* شبكة المحتوى (المنتجات والملخص) */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
          
          {/* قائمة المنتجات */}
          <div className="grid gap-4">
            {c.map((x, i) => (
              <div 
                className="bg-card border border-border/60 flex items-center gap-4 p-4 md:p-6 rounded-3xl transition hover:shadow-md relative overflow-hidden group" 
                key={`${x.productId}:${x.variantId || i}`}
              >
                <img 
                  src={x.image || '/placeholder.png'} 
                  alt={x.name} 
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover flex-shrink-0 border border-border/40 bg-black/5" 
                />
                <div className="flex-1 space-y-1.5">
                  <h3 className="font-bold text-base md:text-lg">{x.name}</h3>
                  {x.variantValue && (
                    <p className="text-muted-foreground text-xs">{x.variantName}: {x.variantValue}</p>
                  )}
                  <p className="text-[var(--gold)] font-bold text-sm md:text-base">
                    {Number(x.price).toLocaleString('ar-EG')} ج.م
                  </p>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                    {/* عداد الكمية */}
                    <div className="inline-flex items-center gap-2 bg-background border border-border/80 rounded-xl px-2 py-1">
                      <button 
                        aria-label="تقليل الكمية" 
                        className="p-1 text-muted-foreground hover:text-foreground transition text-sm" 
                        onClick={() => save(c.map((y, j) => (j === i ? { ...y, quantity: Math.max(1, y.quantity - 1) } : y)))}
                      >
                        <Minus size={14} />
                      </button>
                      <span aria-live="polite" className="w-6 text-center text-sm font-bold">{x.quantity}</span>
                      <button 
                        aria-label="زيادة الكمية" 
                        className="p-1 text-muted-foreground hover:text-foreground transition text-sm" 
                        onClick={() => save(c.map((y, j) => (j === i ? { ...y, quantity: Math.min(y.quantity + 1, y.maxStock || 99) } : y)))}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* زر الحذف */}
                    <button 
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition px-2 py-1" 
                      onClick={() => save(c.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={15} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ملخص الطلب الجانبي */}
          <aside className="bg-card border border-border/60 rounded-3xl p-6 shadow-md sticky top-24 space-y-6">
            <h2 className="text-xl font-bold border-b border-border/40 pb-4">ملخص الطلب</h2>

            {free > 0 && (
              <div className="bg-background border border-border/60 p-3.5 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{remain ? `أضيفي ${remain.toLocaleString('ar-EG')} ج.م للشحن المجاني` : 'تم الوصول للشحن المجاني 🎉'}</span>
                  <span className="text-[var(--gold)] font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/40">
                  <div className="h-full bg-[var(--gold)] transition-all rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">كود الخصم</label>
              <input 
                value={coupon} 
                onChange={e => setCoupon(e.target.value.toUpperCase())} 
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" 
                placeholder="اختياري" 
                dir="ltr" 
              />
            </div>

            <div className="flex justify-between items-center text-base font-bold border-t border-border/40 pt-4">
              <span className="text-muted-foreground text-sm">الإجمالي
              <span className="text-[var(--gold)] text-lg">{total.toLocaleString('ar-EG')} ج.م</span>
            </div>

            <Link 
              href={coupon ? `/checkout?coupon=${encodeURIComponent(coupon)}` : '/checkout'} 
              className="w-full py-4 rounded-2xl bg-[var(--gold)] text-black font-bold text-base shadow-lg hover:opacity-95 transition text-center block"
            >
              متابعة لتحديد عنوان الشحن
            </Link>
          </aside>
        </div>

      </div>
    </main>
  );
}
