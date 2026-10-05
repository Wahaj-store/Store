'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, Clock3, Hash, Home, MapPin, PackageCheck, Phone, Search, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

interface TimelineItem { status: string; note?: string; createdAt: string; }
interface OrderItem { id: string; name?: string; quantity: number; price: number; variantName?: string; }
interface ShipmentData { provider?: string | null; trackingNumber?: string | null; status?: string; shippedAt?: string | null; deliveredAt?: string | null; estimatedMinDays?: number | null; estimatedMaxDays?: number | null; events?: TimelineItem[]; }
interface OrderData {
  number: string; status: string; paymentMethod: string; paymentStatus: string; total: number;
  shippingProvider?: string; trackingNumber?: string; shippingGovernorate?: string; shippingCity?: string; shippingAddress?: string;
  timeline?: TimelineItem[]; items?: OrderItem[]; shipments?: ShipmentData[];
}

const statusSteps = [
  { key: 'NEW', label: 'تم الاستلام', icon: PackageCheck },
  { key: 'PROCESSING', label: 'قيد التجهيز', icon: Clock3 },
  { key: 'SHIPPED', label: 'تم الشحن', icon: Truck },
  { key: 'DELIVERED', label: 'تم التسليم', icon: CheckCircle2 },
];
const statusLabels: Record<string, string> = { NEW: 'تم استلام الطلب', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'تم إلغاء الطلب' };
const paymentLabels: Record<string, string> = { COD: 'الدفع عند الاستلام', INSTAPAY: 'InstaPay', VODAFONE_CASH: 'فودافون كاش', PENDING: 'قيد المراجعة', CONFIRMED: 'تم التأكيد', FAILED: 'تعذر التأكيد' };

function stepIndex(status: string) { return status === 'NEW' ? 0 : status === 'PROCESSING' ? 1 : status === 'SHIPPED' ? 2 : status === 'DELIVERED' ? 3 : -1; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) { setError('يرجى إدخال رقم الطلب ورقم الهاتف المسجل'); return; }
    setLoading(true); setError(''); setOrder(null);
    try {
      const res = await fetch('/api/track-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }) });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'عذرًا، لم يتم العثور على الطلب'); else setOrder(data);
    } catch { setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقًا'); }
    finally { setLoading(false); }
  };

  const currentStep = order ? stepIndex(order.status) : 0;
  const shipment = order?.shipments?.[0];
  const updates = useMemo(() => order?.timeline || [], [order]);
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <main className="wahaj-track-page" dir="rtl">
      <div className="wahaj-commerce-shell wahaj-track-shell">
        <header className="wahaj-commerce-header wahaj-track-header">
          <div>
            <span className="wahaj-commerce-kicker"><ShieldCheck size={14} /> متابعة آمنة ومباشرة</span>
            <h1>تتبعي طلبكِ بثقة</h1>
            <p>أدخلي رقم الطلب ورقم الهاتف المستخدم عند الشراء لمعرفة آخر تحديثات التجهيز والشحن.</p>
          </div>
          <Link href="/" className="wahaj-commerce-ghost"><Home size={16} /> الرئيسية</Link>
        </header>

        <section className="wahaj-track-search-card">
          <div className="wahaj-track-search-card__intro"><div className="wahaj-track-search-icon"><Search size={21} /></div><div><span>تتبع الشحنة</span><h2>أين وصل طلبكِ؟</h2><p>نستخدم بيانات الطلب للتحقق من هويتكِ وحماية تفاصيل الشحنة.</p></div></div>
          <form onSubmit={handleTrack} className="wahaj-track-form">
            <label><span>رقم الطلب</span><div><Hash size={16} /><input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="WAH-7B2A700C" dir="ltr" autoComplete="off" /></div></label>
            <label><span>رقم الهاتف المسجل</span><div><Phone size={16} /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" autoComplete="tel" /></div></label>
            <button className="wahaj-commerce-primary" type="submit" disabled={loading}><Search size={17} />{loading ? 'جارٍ البحث...' : 'بحث عن الطلب'} </button>
          </form>
          {error && <div className="wahaj-track-error" role="alert">{error}</div>}
          <p className="wahaj-track-security"><ShieldCheck size={14} /> لا نعرض أي بيانات إلا بعد مطابقة رقم الطلب والهاتف المسجل.</p>
        </section>

        {!order && !loading && !error && <section className="wahaj-track-guide"><div><PackageCheck size={20} /><b>بعد تأكيد الطلب</b><span>ستظهر هنا كل مراحل طلبكِ وتفاصيل الشحن.</span></div><div><Truck size={20} /><b>تحديثات التوصيل</b><span>تابعي شركة الشحن ورقم التتبع عند توفرهما.</span></div><div><Phone size={20} /><b>تحتاجين مساعدة؟</b><span>تواصلي معنا مع الاحتفاظ برقم الطلب.</span></div></section>}

        {order && <section className="wahaj-track-result">
          <div className="wahaj-track-result__top"><div><span className="wahaj-cart-summary__label">تفاصيل الطلب</span><h2 dir="ltr">#{order.number}</h2><small>آخر تحديث: {formatDate(updates[0]?.createdAt)}</small></div><span className={`wahaj-track-status ${isCancelled ? 'is-cancelled' : 'is-active'}`}>{statusLabels[order.status] || order.status}</span></div>

          {isCancelled ? <div className="wahaj-track-cancelled"><PackageCheck size={22} /><div><b>تم إلغاء هذا الطلب</b><p>إذا كنتِ بحاجة إلى مزيد من التفاصيل، تواصلي مع فريق وَهَج واذكري رقم الطلب.</p></div></div> : <div className="wahaj-track-progress"><div className="wahaj-track-section-heading"><span>رحلة الطلب</span><b>{Math.max(currentStep + 1, 1)} من {statusSteps.length} مراحل</b></div><div className="wahaj-track-progress-grid">{statusSteps.map((step, index) => { const Icon = step.icon; const done = index < currentStep; const current = index === currentStep; return <div key={step.key} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}><span><Icon size={17} /></span><b>{step.label}</b><small>{current ? 'الحالة الحالية' : done ? 'اكتملت' : 'لاحقًا'}</small></div>; })}</div></div>}

          <div className="wahaj-track-info-grid"><div><span>طريقة الدفع</span><b>{paymentLabels[order.paymentMethod] || order.paymentMethod}</b></div><div><span>حالة الدفع</span><b>{paymentLabels[order.paymentStatus] || order.paymentStatus}</b></div><div><span>الإجمالي النهائي</span><b className="is-gold">{Number(order.total).toLocaleString('ar-EG')} ج.م</b></div></div>

          {(order.shippingProvider || order.trackingNumber || shipment) && <div className="wahaj-track-shipment"><div className="wahaj-track-section-heading"><span>تفاصيل الشحن</span><Truck size={17} /></div><div className="wahaj-track-shipment-grid"><div><small>شركة الشحن</small><b>{shipment?.provider || order.shippingProvider || 'سيتم التحديد قريبًا'}</b></div><div><small>رقم التتبع</small><b dir="ltr">{shipment?.trackingNumber || order.trackingNumber || 'سيظهر عند الشحن'}</b></div>{shipment?.estimatedMinDays != null && <div><small>موعد التوصيل المتوقع</small><b>{shipment.estimatedMinDays}{shipment.estimatedMaxDays ? `–${shipment.estimatedMaxDays}` : ''} أيام</b></div>}</div></div>}

          {order.shippingGovernorate && <div className="wahaj-track-address"><MapPin size={17} /><div><span>عنوان التوصيل</span><b>{order.shippingGovernorate}، {order.shippingCity} — {order.shippingAddress}</b></div></div>}

          <div className="wahaj-track-columns"><div className="wahaj-track-panel"><div className="wahaj-track-section-heading"><span>سجل التحديثات</span><Clock3 size={17} /></div><div className="wahaj-track-timeline">{updates.length ? updates.map((item, index) => <div key={`${item.createdAt}-${index}`} className={index === 0 ? 'is-latest' : ''}><i>{index === 0 ? <Check size={11} /> : null}</i><div><b>{statusLabels[item.status] || item.status}</b><small>{item.note || 'تم تحديث حالة الطلب'}</small><time>{formatDate(item.createdAt)}</time></div></div>) : <p className="wahaj-track-empty">لا توجد تحديثات مسجلة بعد.</p>}</div></div><div className="wahaj-track-panel"><div className="wahaj-track-section-heading"><span>محتويات الطلب</span><ShoppingBag size={17} /></div><div className="wahaj-track-items">{order.items?.map(item => <div key={item.id}><div><b>{item.name || 'منتج'}</b>{item.variantName && <small>الخيار: {item.variantName}</small>}<small>الكمية: {item.quantity}</small></div><strong>{Number(item.price).toLocaleString('ar-EG')} ج.م</strong></div>)}</div></div></div>
          <div className="wahaj-track-result__footer"><Link href="/shop" className="wahaj-commerce-primary"><ShoppingBag size={17} /> مواصلة التسوق</Link><Link href="/contact" className="wahaj-commerce-ghost">تحتاجين مساعدة؟ <ArrowLeft size={16} /></Link></div>
        </section>}
      </div>
    </main>
  );
}
