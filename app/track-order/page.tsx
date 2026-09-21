'use client';
import { useState, FormEvent } from 'react';
import { Search, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TimelineItem {
  status: string;
  note?: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  name?: string;
  product?: { name: string };
  quantity: number;
  price: number;
}

interface OrderData {
  number: string;
  status: string;
  paymentMethod: string;
  total: number;
  shippingProvider?: string;
  trackingNumber?: string;
  timeline?: TimelineItem[];
  items?: OrderItem[];
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) {
      setError('يرجى إدخال رقم الطلب ورقم الهاتف');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء البحث');
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container max-w-3xl py-12" dir="rtl">
      <div className="mb-6">
        <Link href="/" className="text-[var(--gold)] text-sm hover:underline inline-flex items-center gap-1">
          <ArrowRight size={16} /> العودة إلى المتجر
        </Link>
      </div>

      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">تتبع طلبك</h1>
        <p className="text-muted-foreground text-sm">أدخل رقم الطلب ورقم الهاتف المستخدم عند إتمام الشراء لمعرفة حالة طلبك الحالية.</p>
      </div>

      <form onSubmit={handleTrack} className="lux-card p-6 space-y-4 bg-card border border-border/60 rounded-2xl shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold mb-1">رقم الطلب (مثال: WAH-7B2A700C)</label>
            <input
              type="text"
              placeholder="أدخل رقم الطلب"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-[var(--gold)]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">رقم الهاتف المسجل في الطلب</label>
            <input
              type="text"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-[var(--gold)]"
              dir="ltr"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--gold)] text-black font-bold hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          <Search size={18} />
          {loading ? 'جارٍ البحث...' : 'بحث وتتبع الطلب'}
        </button>
      </form>

      {order && (
        <div className="mt-8 space-y-6 animate-fade-in">
          <div className="lux-card p-6 space-y-4 bg-card border border-border/60 rounded-2xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border/40 pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">تفاصيل الطلب</span>
                <h2 className="text-xl font-bold">طلب #{order.number}</h2>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold text-xs">
                الحالة الحالية: {order.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm pt-2">
              <div>
                <span className="text-muted-foreground block text-xs">طريقة الدفع</span>
                <span className="font-semibold">{order.paymentMethod}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">الإجمالي النهائي</span>
                <span className="font-semibold text-[var(--gold)]">{Number(order.total).toLocaleString('ar-EG')} ج.م</span>
              </div>
              {order.shippingProvider && (
                <div>
                  <span className="text-muted-foreground block text-xs">شركة الشحن</span>
                  <span className="font-semibold">{order.shippingProvider}</span>
                </div>
              )}
            </div>

            {order.trackingNumber && (
              <div className="p-3 rounded-xl bg-background border border-border text-sm flex justify-between items-center">
                <span className="text-muted-foreground">رقم التتبع لدى شركة الشحن:</span>
                <span className="font-bold" dir="ltr">{order.trackingNumber}</span>
              </div>
            )}

            <div className="space-y-3 border-t border-border/40 pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Clock size={16} className="text-[var(--gold)]" /> سجل ومتابعة خط سير الطلب
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/40">
                      <div>
                        <span className="font-bold text-[var(--gold)]">{t.status}</span>
                        {t.note && <span className="text-muted-foreground block mt-0.5">{t.note}</span>}
                      </div>
                      <span className="text-muted-foreground text-[11px]" dir="ltr">
                        {new Date(t.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-2">لا توجد تحديثات مسجلة بعد.</p>
                )}
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-3">
              <h3 className="font-semibold text-sm">المنتجات المطلوبة</h3>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-background border border-border/40">
                    <div>
                      <span className="font-medium">{item.product?.name || item.name}</span>
                      <span className="text-xs text-muted-foreground block">الكمية: {item.quantity}</span>
                    </div>
                    <span className="font-semibold">{Number(item.price).toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
