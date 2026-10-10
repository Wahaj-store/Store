'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft, ArrowUpLeft, Banknote, CalendarDays, CheckCircle2, CircleAlert, Eye,
  Clock3, FileText, MapPin, Package, RefreshCw, ShieldCheck, ShoppingBag,
  Truck, UserRound, Phone, X,
} from 'lucide-react';

type Order = any;
const orderStatusLabels: Record<string, string> = { NEW: 'جديد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي' };
const paymentStatusLabels: Record<string, string> = { PENDING: 'بانتظار الدفع', CONFIRMED: 'مدفوع', FAILED: 'فشل الدفع' };
const paymentMethodLabels: Record<string, string> = { COD: 'الدفع عند الاستلام', VODAFONE_CASH: 'فودافون كاش', INSTAPAY: 'إنستاباي' };
const money = (value: unknown) => `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
const formatDateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function OrderStatus({ status }: { status: string }) {
  const tone = status === 'DELIVERED' ? 'success' : status === 'CANCELLED' ? 'danger' : status === 'SHIPPED' ? 'blue' : status === 'PROCESSING' ? 'gold' : 'muted';
  return <span className={`order-status order-status--${tone}`}><i />{orderStatusLabels[status] || status}</span>;
}

function InfoRow({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="order-info-row"><span>{label}</span><b dir={ltr ? 'ltr' : undefined}>{value || '—'}</b></div>;
}

function DetailMetric({ icon: Icon, label, value, tone = 'gold' }: any) {
  return <article className="order-detail-metric"><span className={`order-summary-card__icon order-summary-card__icon--${tone}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-[9px] text-muted-foreground sm:text-[10px]">{label}</p><p className="mt-1 truncate text-sm font-bold sm:text-base">{value}</p></div></article>;
}

export default function OrderDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const orderId = resolvedParams.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [shippingProvider, setShippingProvider] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [generalNote, setGeneralNote] = useState('');

  const fetchOrder = useCallback(async () => {
    setFetching(true);
    setFetchError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحميل بيانات الطلب.');
      setOrder(data);
    } catch (error: any) {
      setFetchError(error?.message || 'تعذر الاتصال بالخادم.');
    } finally {
      setFetching(false);
    }
  }, [orderId]);

  useEffect(() => { void fetchOrder(); }, [fetchOrder]);

  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const paymentProofAvailable = Array.isArray(order?.payments) && order.payments.some(
    (payment: any) => typeof payment?.proofUrl === 'string' && payment.proofUrl.length > 0,
  );
  const itemCount = useMemo(() => items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0), [items]);
  const addressText = order?.shippingGovernorate
    ? [order.shippingGovernorate, order.shippingCity, order.shippingAddress].filter(Boolean).join(' · ')
    : order?.customer?.addresses?.[0]
      ? [order.customer.addresses[0].governorate, order.customer.addresses[0].city, order.customer.addresses[0].address].filter(Boolean).join(' · ')
      : 'لا يوجد عنوان محفوظ';

  async function updateStatus(newStatus: string) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          shippingProvider: newStatus === 'SHIPPED' ? shippingProvider : undefined,
          trackingNumber: newStatus === 'SHIPPED' ? trackingNumber : undefined,
          note: generalNote || `تم تغيير الحالة إلى ${newStatus}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'حدث خطأ أثناء تحديث حالة الطلب.');
      setGeneralNote('');
      setMessage({ tone: 'success', text: 'تم تحديث الحالة وتسجيلها في خط سير الطلب.' });
      await fetchOrder();
    } catch (error: any) {
      setMessage({ tone: 'error', text: error?.message || 'تعذر الاتصال بالخادم.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="order-page-hero order-detail-hero">
          <div className="relative z-10 min-w-0"><Link href="/admin/orders" className="order-page-back"><ArrowUpLeft size={14} /> قائمة الطلبات</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="order-page-hero__eyebrow"><Package size={15} /> تفاصيل الطلب</span>{order && <OrderStatus status={order.status} />}</div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{order ? `طلب #${order.number}` : 'إدارة الطلب'}</h1>
            <p className="mt-2 text-xs leading-6 text-muted-foreground sm:text-sm">راجع محتويات الطلب، بيانات العميل، حالة الدفع والشحن، وسجل التحديثات.</p>
            {order?.createdAt && <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><CalendarDays size={13} /> أُنشئ في {formatDateTime(order.createdAt)}</span>}
          </div>
          <div className="order-page-hero__actions"><span className="order-page-hero__secure"><ShieldCheck size={16} /> تغييرات موثّقة</span><button type="button" onClick={() => void fetchOrder()} disabled={fetching} className="admin-action admin-action--secondary"><RefreshCw size={15} className={fetching ? 'animate-spin' : ''} /> تحديث</button><button type="button" onClick={() => window.open(`/api/admin/orders/${orderId}/invoice`, '_blank', 'noopener,noreferrer')} className="admin-action admin-action--gold"><FileText size={15} /> فاتورة PDF</button></div>
          <span className="order-page-hero__watermark" aria-hidden="true">ط</span>
        </header>

        {message && <div role={message.tone === 'error' ? 'alert' : 'status'} className={`orders-alert orders-alert--${message.tone}`}><span>{message.tone === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}</span><span>{message.text}</span><button type="button" onClick={() => setMessage(null)} aria-label="إغلاق الرسالة"><X size={15} /></button></div>}

        {fetching && !order ? <div className="orders-loading"><span className="orders-spinner" /> جارٍ تحميل بيانات الطلب…</div> : !order ? <section className="orders-empty"><span><CircleAlert size={22} /></span><b>{fetchError || 'تعذر العثور على الطلب'}</b><p>تحقق من الاتصال أو ارجع إلى قائمة الطلبات.</p><button type="button" onClick={() => void fetchOrder()} className="admin-action admin-action--gold mt-2"><RefreshCw size={14} /> إعادة المحاولة</button></section> : <>
          {fetchError && <div role="alert" className="orders-alert"><CircleAlert size={17} /><span>{fetchError}</span><button type="button" onClick={() => void fetchOrder()} className="text-xs font-bold underline">إعادة المحاولة</button></div>}

          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3" aria-label="ملخص الطلب">
            <DetailMetric icon={Banknote} label="الإجمالي النهائي" value={money(order.total)} />
            <DetailMetric icon={ShoppingBag} label="عدد الوحدات" value={itemCount.toLocaleString('ar-EG')} tone="blue" />
            <DetailMetric icon={CheckCircle2} label="حالة الدفع" value={paymentStatusLabels[order.paymentStatus] || order.paymentStatus || '—'} tone="green" />
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.75fr)]">
            <div className="space-y-5">
              <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><Clock3 size={17} /></span><div><h2 className="font-serif text-base font-bold sm:text-lg">حالة الطلب وخط السير</h2><p className="mt-1 text-[10px] text-muted-foreground">تغيير الحالة يسجل حدثًا ويربط التحديث بالشحنة.</p></div></div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-[var(--surface)]/65 p-3"><span className="text-xs text-muted-foreground">الحالة الحالية</span><OrderStatus status={order.status} /></div>
                  {!!order.timeline?.length && <div className="mt-4"><p className="mb-3 text-xs font-semibold">سجل التحديثات</p><div className="order-timeline">{[...order.timeline].reverse().map((entry: any, index: number) => <div key={entry.id || index} className="order-timeline__item"><span className="order-timeline__dot"><CheckCircle2 size={12} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs">{orderStatusLabels[entry.status] || entry.status}</b><time className="text-[9px] text-muted-foreground" dir="ltr">{formatDateTime(entry.createdAt)}</time></div>{entry.note && <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{entry.note}</p>}</div></div>)}</div></div>}

                  {order.status === 'PROCESSING' && <div className="mt-4 rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-3 sm:p-4"><p className="text-xs font-semibold">بيانات الشحن عند تأكيد الإرسال</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="order-field">شركة الشحن<input value={shippingProvider} onChange={event => setShippingProvider(event.target.value)} placeholder="مثال: بوسطة أو أرامكس" className="order-input" /></label><label className="order-field">رقم التتبع<input value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} placeholder="Tracking number" dir="ltr" className="order-input" /></label></div></div>}

                  {['NEW', 'PROCESSING', 'SHIPPED'].includes(order.status) && <label className="order-field mt-4 block">ملاحظة اختيارية للتحديث<input value={generalNote} onChange={event => setGeneralNote(event.target.value)} placeholder="أضف ملاحظة تظهر في سجل الطلب…" className="order-input" /></label>}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
                    {order.status === 'NEW' && <button type="button" disabled={saving} onClick={() => void updateStatus('PROCESSING')} className="admin-action admin-action--gold"><Package size={15} /> بدء التجهيز</button>}
                    {order.status === 'PROCESSING' && <button type="button" disabled={saving} onClick={() => void updateStatus('SHIPPED')} className="admin-action admin-action--gold"><Truck size={15} /> تأكيد الشحن</button>}
                    {order.status === 'SHIPPED' && <button type="button" disabled={saving} onClick={() => void updateStatus('DELIVERED')} className="admin-action admin-action--gold"><CheckCircle2 size={15} /> تأكيد التسليم</button>}
                    {['NEW', 'PROCESSING', 'SHIPPED'].includes(order.status) && <button type="button" disabled={saving} onClick={() => void updateStatus('CANCELLED')} className="admin-action admin-action--danger mr-auto">إلغاء الطلب</button>}
                    {saving && <span className="inline-flex items-center gap-2 text-[10px] text-muted-foreground"><span className="orders-spinner orders-spinner--small" /> جارٍ حفظ التحديث…</span>}
                  </div>
                </div>
              </section>

              <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><ShoppingBag size={17} /></span><div><h2 className="font-serif text-base font-bold sm:text-lg">منتجات الطلب</h2><p className="mt-1 text-[10px] text-muted-foreground">تفاصيل الكميات والأسعار كما سُجلت عند إنشاء الطلب.</p></div></div>
                <div className="divide-y divide-border/50 px-4 sm:px-5">{items.map((item: any) => <article key={item.id} className="order-line-item"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.product?.name || item.name || 'منتج المتجر'}</p>{item.variantName && <p className="mt-1 text-[10px] text-muted-foreground">الخيار: {item.variantName}</p>}<p className="mt-1 text-[10px] text-muted-foreground">الكمية: {Number(item.quantity || 0).toLocaleString('ar-EG')} × {money(item.price)}</p></div><b className="shrink-0 text-sm text-[var(--gold-muted)]">{money(Number(item.price || 0) * Number(item.quantity || 0))}</b></article>)}{!items.length && <div className="py-8 text-center text-xs text-muted-foreground">لا توجد عناصر مسجلة لهذا الطلب.</div>}</div>
                <div className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-4 py-3 sm:mx-5 sm:mb-5"><span className="text-xs font-semibold">الإجمالي النهائي</span><b className="text-lg text-[var(--gold-muted)]">{money(order.total)}</b></div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><UserRound size={17} /></span><div><h2 className="font-serif text-base font-bold">بيانات العميل</h2><p className="mt-1 text-[10px] text-muted-foreground">بيانات التواصل المسجلة مع الطلب.</p></div></div>
                <div className="space-y-3 p-4 sm:p-5"><div className="rounded-2xl border border-border/50 bg-[var(--surface)]/55 p-3.5"><div className="flex items-center gap-2"><span className="order-avatar"><UserRound size={15} /></span><b className="text-sm">{order.customer?.name || order.customerNameSnapshot || 'زائر'}</b></div><div className="mt-3 space-y-2">{(order.customer?.phone || order.customerPhoneSnapshot) && <a href={`tel:${order.customer?.phone || order.customerPhoneSnapshot}`} dir="ltr" className="flex items-center justify-end gap-2 text-xs text-muted-foreground"><Phone size={13} />{order.customer?.phone || order.customerPhoneSnapshot}</a>}{order.customer?.email && <a href={`mailto:${order.customer.email}`} dir="ltr" className="flex items-center justify-end gap-2 break-all text-xs text-muted-foreground"><span>{order.customer.email}</span></a>}</div>{order.customer?.id && <Link href={`/admin/customers/${order.customer.id}`} className="order-open-link mt-3">ملف العميل <ArrowDownLeft size={14} /></Link>}</div>
                  <div className="space-y-2 border-t border-border/50 pt-3"><InfoRow label="حالة الطلب" value={orderStatusLabels[order.status] || order.status} /><InfoRow label="طريقة الدفع" value={paymentMethodLabels[order.paymentMethod] || order.paymentMethod} /><InfoRow label="حالة الدفع" value={paymentStatusLabels[order.paymentStatus] || order.paymentStatus} />{order.shippingProvider && <InfoRow label="شركة الشحن" value={order.shippingProvider} />}{order.trackingNumber && <InfoRow label="رقم التتبع" value={order.trackingNumber} ltr />}</div>
                </div>
              </section>

              {!!payments.length && <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><Banknote size={17} /></span><div><h2 className="font-serif text-base font-bold sm:text-lg">بيانات الدفع</h2><p className="mt-1 text-[10px] text-muted-foreground">بيانات الدفع المسجلة مع الطلب.</p></div></div>
                <div className="space-y-2 p-4 sm:p-5">
                  {payments.map((payment: any, index: number) => <div key={payment.id || index} className="rounded-xl border border-border/50 bg-[var(--surface)]/55 p-3">
                    <div className="space-y-2">
                      <InfoRow label="طريقة الدفع" value={paymentMethodLabels[payment.method] || payment.method} />
                      <InfoRow label="رقم عملية التحويل" value={payment.reference || 'غير مسجل'} ltr />
                      <InfoRow label="مبلغ الدفع" value={money(payment.amount)} />
                      <InfoRow label="حالة العملية" value={paymentStatusLabels[payment.status] || payment.status || '—'} />
                    </div>
                  </div>)}
                </div>
              </section>}

              {paymentProofAvailable && <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><Eye size={17} /></span><div><h2 className="font-serif text-base font-bold">إثبات الدفع</h2><p className="mt-1 text-[10px] text-muted-foreground">معاينة خاصة متاحة للمستخدمين المخوّلين فقط.</p></div></div>
                <div className="space-y-3 p-4 sm:p-5">
                  <a
                    href={`/api/admin/orders/${orderId}/payment-proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-action admin-action--gold"
                  >
                    <Eye size={15} /> فتح الإثبات بالحجم الكامل
                  </a>
                  <a
                    href={`/api/admin/orders/${orderId}/payment-proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="فتح إثبات الدفع بالحجم الكامل"
                    className="block overflow-hidden rounded-xl border border-border/60 bg-[var(--surface)]"
                  >
                    <img
                      src={`/api/admin/orders/${orderId}/payment-proof`}
                      alt="إثبات الدفع المرفق بالطلب"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="max-h-[420px] w-full object-contain"
                    />
                  </a>
                </div>
              </section>}

              <section className="order-detail-panel">
                <div className="order-detail-panel__head"><span className="orders-section-icon"><MapPin size={17} /></span><div><h2 className="font-serif text-base font-bold">عنوان الشحن</h2><p className="mt-1 text-[10px] text-muted-foreground">العنوان المرتبط بهذا الطلب.</p></div></div>
                <p className="p-4 text-xs leading-6 text-muted-foreground sm:p-5">{addressText}</p>
              </section>
            </aside>
          </div>
          <p className="flex items-center justify-center gap-2 pb-2 text-center text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-[var(--gold-muted)]" /> تحديثات الطلب تُحفظ عبر واجهات الإدارة الحالية وتظهر في خط السير.</p>
        </>}
      </div>
    </main>
  );
}
