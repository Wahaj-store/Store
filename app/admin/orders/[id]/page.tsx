'use client';
import { useEffect, useState, use } from 'react';
import { Clock, CheckCircle2, Truck, XCircle, AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';

export default function OrderDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // فك الـ params لضمان التوافق مع Next.js الحديث
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const orderId = resolvedParams.id;

  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false); // أضفنا حالة للخطأ لتجنب التعليق
  const [msg, setMsg] = useState('');
  
  const [shippingProvider, setShippingProvider] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [generalNote, setGeneralNote] = useState('');

  const fetchOrder = async () => {
    try {
      setFetchError(false);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setO(data);
      } else {
        setFetchError(true);
      }
    } catch (e) {
      console.error(e);
      setFetchError(true);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          shippingProvider: newStatus === 'SHIPPED' ? shippingProvider : undefined,
          trackingNumber: newStatus === 'SHIPPED' ? trackingNumber : undefined,
          note: generalNote || `تم تغيير الحالة إلى ${newStatus}`
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || 'حدث خطأ أثناء التحديث');
      } else {
        setMsg('تم تحديث حالة الطلب بنجاح وتحديث خط سير العميل!');
        setGeneralNote('');
        await fetchOrder();
      }
    } catch (err) {
      setMsg('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // حماية إضافية: إذا حدث خطأ في الـ API لا تترك الشاشة معلقة للأبد
  if (fetchError && !o) {
    return (
      <main className="container py-10" dir="rtl">
        <Link href="/admin/orders" className="text-[var(--gold)] hover:underline inline-block mb-4">
          ‹ العودة لقائمة الطلبات
        </Link>
        <div className="p-5 rounded-2xl bg-card border border-red-500/30 text-center space-y-3">
          <p className="text-red-500 font-semibold">حدث خطأ أثناء جلب بيانات الطلب من الخادم.</p>
          <button 
            onClick={fetchOrder}
            className="px-4 py-2 rounded-xl bg-[var(--gold)] text-black text-xs font-bold cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  if (!o) return <main className="container py-10" dir="rtl">جارٍ التحميل وتحضير بيانات الطلب…</main>;

  return (
    <main className="container py-10" dir="rtl">
      <Link href="/admin/orders" className="text-[var(--gold)] hover:underline inline-block mb-4">
        ‹ العودة لقائمة الطلبات
      </Link>
      <h1 className="text-3xl font-semibold">تفاصيل الطلب #{o.number}</h1>
      
      {msg && (
        <div className="mt-4 p-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-sm text-[var(--gold)] font-medium">
          {msg}
        </div>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          
          <div className="lux-card p-5 space-y-4 bg-card border border-border/60 rounded-2xl shadow-sm">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={18} className="text-[var(--gold)]" /> خط سير الطلب والحالة الحالية (مربوط بحساب العميل)
            </h2>
            
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-background border border-border/60 text-sm">
              <span>الحالة الحالية:</span>
              <span className="px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold text-xs">
                {o.status}
              </span>
            </div>

            {o.timeline && o.timeline.length > 0 && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                <span className="text-xs font-semibold text-muted-foreground block">سجل التحديثات:</span>
                <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                  {o.timeline.map((t: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/40">
                      <div>
                        <span className="font-bold text-[var(--gold)]">{t.status}</span>
                        {t.note && <span className="text-muted-foreground block mt-0.5">{t.note}</span>}
                      </div>
                      <span className="text-muted-foreground text-[11px]" dir="ltr">
                        {new Date(t.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {o.status === 'PROCESSING' && (
              <div className="border-t border-border/40 pt-3 space-y-3">
                <span className="text-xs font-semibold block">بيانات الشحن الاختيارية (عند الانتقال للشحن):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="شركة الشحن (مثل بوسطة، أرامكس...)"
                    value={shippingProvider}
                    onChange={(e) => setShippingProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[var(--gold)]"
                  />
                  <input
                    type="text"
                    placeholder="رقم التتبع"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[var(--gold)]"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <input
                type="text"
                placeholder="أضف ملاحظة اختيارية للتحديث..."
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              {o.status === 'NEW' && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('PROCESSING')}
                  className="px-4 py-2.5 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                >
                  بدء تجهيز الطلب (Processing)
                </button>
              )}

              {o.status === 'PROCESSING' && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('SHIPPED')}
                  className="px-4 py-2.5 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                >
                  تأكيد الشحن (Shipped)
                </button>
              )}

              {o.status === 'SHIPPED' && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('DELIVERED')}
                  className="px-4 py-2.5 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                >
                  تأكيد التسليم (Delivered)
                </button>
              )}

              {['NEW', 'PROCESSING', 'SHIPPED'].includes(o.status) && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('CANCELLED')}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50 mr-auto cursor-pointer"
                >
                  إلغاء الطلب (Cancelled)
                </button>
              )}
            </div>
          </div>

          <section className="lux-card p-5 space-y-4 bg-card border border-border/60 rounded-2xl shadow-sm">
            <h2 className="font-semibold">المنتجات</h2>
            {o.items?.map((x: any) => (
              <div key={x.id} className="flex justify-between border-b border-border/40 py-4">
                <div>
                  <b>{x.product?.name || x.name}</b>
                  {x.variantName && <p className="text-xs text-muted-foreground mt-0.5">الخيار: {x.variantName}</p>}
                  <p className="text-muted-foreground text-sm">الكمية: {x.quantity}</p>
                </div>
                <span>{Number(x.price).toLocaleString('ar-EG')} ج.م</span>
              </div>
            ))}
            <div className="mt-5 flex justify-between font-semibold text-base pt-2 border-t border-border/40">
              <span>الإجمالي النهائي</span>
              <span className="text-[var(--gold)]">{Number(o.total).toLocaleString('ar-EG')} ج.م</span>
            </div>
          </section>

        </section>

        <aside className="lux-card p-5 space-y-4 bg-card border border-border/60 rounded-2xl shadow-sm">
          <div>
            <h2 className="font-semibold">بيانات العميل</h2>
            <p className="mt-2 font-medium">{o.customer?.name || o.customerNameSnapshot || 'زائر'}</p>
            <p className="text-muted-foreground text-sm" dir="ltr">{o.customer?.phone || o.customerPhoneSnapshot}</p>
          </div>

          <div className="border-t border-border/40 pt-3 space-y-1.5 text-sm">
            <p><span className="text-muted-foreground">الحالة:</span> <span className="font-semibold text-[var(--gold)]">{o.status}</span></p>
            <p><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-semibold">{o.paymentMethod}</span></p>
            <p><span className="text-muted-foreground">حالة الدفع:</span> <span className="font-semibold">{o.paymentStatus}</span></p>
            {o.shippingProvider && <p><span className="text-muted-foreground">شركة الشحن:</span> <span className="font-semibold">{o.shippingProvider}</span></p>}
            {o.trackingNumber && <p><span className="text-muted-foreground">رقم التتبع:</span> <span className="font-semibold" dir="ltr">{o.trackingNumber}</span></p>}
          </div>

          <div className="border-t border-border/40 pt-3 text-xs leading-relaxed">
            <span className="text-muted-foreground block font-medium mb-1">عنوان الشحن:</span>
            <p>
              {o.shippingGovernorate 
                ? `${o.shippingGovernorate} - ${o.shippingCity} - ${o.shippingAddress}` 
                : (o.customer?.addresses?.[0] 
                    ? `${o.customer.addresses[0].governorate} - ${o.customer.addresses[0].city} - ${o.customer.addresses[0].address}` 
                    : 'لا يوجد عنوان محفوظ')}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
