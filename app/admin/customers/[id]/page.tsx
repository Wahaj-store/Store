'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpLeft, CalendarDays, CheckCircle2, CircleAlert, Clock3, Mail,
  MapPin, Package, Phone, RefreshCw, ShieldCheck, ShoppingBag, Star, UserRound, X,
} from 'lucide-react';

type Customer = any;
const orderStatusLabels: Record<string, string> = { NEW: 'جديد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي' };
const money = (value: unknown) => `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

function CustomerOrderStatus({ status }: { status: string }) {
  const tone = status === 'DELIVERED' ? 'success' : status === 'CANCELLED' ? 'danger' : status === 'SHIPPED' ? 'blue' : status === 'PROCESSING' ? 'gold' : 'muted';
  return <span className={`order-status order-status--${tone}`}><i />{orderStatusLabels[status] || status}</span>;
}

function ProfileMetric({ icon: Icon, label, value, note, tone = 'gold' }: any) {
  return <article className="profile-metric"><span className={`profile-metric__icon profile-metric__icon--${tone}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p><p className="mt-1 text-lg font-bold sm:text-2xl">{value}</p><p className="mt-1 truncate text-[9px] text-muted-foreground">{note}</p></div></article>;
}

export default function CustomerDetail({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers/${params.id}`, { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحميل ملف العميل.');
      setCustomer(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void loadCustomer(); }, [loadCustomer]);
  const orders = Array.isArray(customer?.orders) ? customer.orders : [];
  const reviews = Array.isArray(customer?.reviews) ? customer.reviews : [];
  const totalSpend = useMemo(() => orders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0), [orders]);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="customer-profile-hero">
          <div className="relative z-10 min-w-0">
            <Link href="/admin" className="order-page-back"><ArrowUpLeft size={14} /> لوحة الإدارة</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="order-page-hero__eyebrow"><UserRound size={15} /> ملف العميل</span><span className="order-page-live"><i /> بيانات الحساب</span></div>
            <h1 className="mt-2 truncate font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{loading ? 'جارٍ تحميل العميل…' : customer?.name || 'تفاصيل العميل'}</h1>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">ملخص التواصل والطلبات والتقييمات المرتبطة بهذا الحساب.</p>
            {customer && <div className="mt-4 flex flex-wrap gap-2">{customer.phone && <a href={`tel:${customer.phone}`} dir="ltr" className="customer-contact-chip"><Phone size={13} />{customer.phone}</a>}{customer.email && <a href={`mailto:${customer.email}`} dir="ltr" className="customer-contact-chip"><Mail size={13} />{customer.email}</a>}</div>}
          </div>
          <div className="customer-profile-hero__actions"><span className="order-page-hero__secure"><ShieldCheck size={16} /> ملف للعرض والإدارة</span><button type="button" onClick={() => void loadCustomer()} disabled={loading} className="admin-action admin-action--secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث الملف</button></div>
          <span className="order-page-hero__watermark" aria-hidden="true">ع</span>
        </header>

        {error && <div role="alert" className="orders-alert"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="إغلاق الرسالة"><X size={15} /></button></div>}

        {loading && !customer ? <div className="orders-loading"><span className="orders-spinner" /> جارٍ تحميل ملف العميل…</div> : customer ? <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4" aria-label="ملخص العميل">
            <ProfileMetric icon={ShoppingBag} label="الطلبات" value={orders.length.toLocaleString('ar-EG')} note="الطلبات المسجلة للحساب" />
            <ProfileMetric icon={Package} label="إجمالي الإنفاق" value={money(totalSpend)} note="مجموع الطلبات المعروضة" tone="blue" />
            <ProfileMetric icon={Star} label="التقييمات" value={reviews.length.toLocaleString('ar-EG')} note="المراجعات المرتبطة بالعميل" tone="gold" />
            <ProfileMetric icon={CalendarDays} label="عضو منذ" value={date(customer.createdAt)} note={customer.lastLoginAt ? `آخر دخول ${date(customer.lastLoginAt)}` : 'لا يوجد دخول مسجل'} tone="green" />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
            <section className="customer-profile-panel">
              <div className="customer-profile-panel__head"><div className="flex items-center gap-2"><span className="orders-section-icon"><ShoppingBag size={17} /></span><div><h2 className="font-serif text-base font-bold sm:text-lg">سجل الطلبات</h2><p className="mt-1 text-[10px] text-muted-foreground">كل الطلبات المرتبطة بحساب العميل.</p></div></div><span className="orders-count">{orders.length} طلب</span></div>
              {orders.length ? <div className="grid gap-3 p-3 sm:p-4">{orders.map((order: any) => <article key={order.id} className="customer-order-card">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/admin/orders/${order.id}`} className="order-number">#{order.number}</Link><p className="mt-1 text-[9px] text-muted-foreground"><Clock3 size={11} className="ml-1 inline" />{date(order.createdAt)}</p></div><CustomerOrderStatus status={order.status} /></div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3"><div><p className="text-[9px] text-muted-foreground">إجمالي الطلب</p><p className="mt-1 text-sm font-bold text-[var(--gold-muted)]">{money(order.total)}</p></div><Link href={`/admin/orders/${order.id}`} className="order-open-link">عرض الطلب <ArrowUpLeft size={14} /></Link></div>
              </article>)}</div> : <ProfileEmpty icon={ShoppingBag} title="لا توجد طلبات بعد" description="ستظهر الطلبات المرتبطة بالعميل هنا." />}
            </section>

            <div className="space-y-5">
              <section className="customer-profile-panel">
                <div className="customer-profile-panel__head"><div className="flex items-center gap-2"><span className="orders-section-icon"><MapPin size={17} /></span><div><h2 className="font-serif text-base font-bold">عناوين العميل</h2><p className="mt-1 text-[10px] text-muted-foreground">العناوين المحفوظة في الحساب.</p></div></div></div>
                <div className="space-y-3 p-3 sm:p-4">{(customer.addresses || []).map((address: any, index: number) => <article key={address.id || index} className="customer-address-card"><div className="flex items-center justify-between gap-2"><b className="text-xs">{address.label || `عنوان ${index + 1}`}</b>{address.isDefault && <span className="customer-default-badge">أساسي</span>}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{[address.governorate, address.city, address.address, address.postalCode].filter(Boolean).join(' · ') || 'لا يوجد عنوان تفصيلي'}</p>{address.phone && <p className="mt-2 text-[10px] text-muted-foreground" dir="ltr">{address.phone}</p>}</article>)}{!customer.addresses?.length && <ProfileEmpty icon={MapPin} title="لا توجد عناوين محفوظة" description="قد يحتوي الطلب على عنوان شحن خاص به." compact />}</div>
              </section>

              <section className="customer-profile-panel">
                <div className="customer-profile-panel__head"><div className="flex items-center gap-2"><span className="orders-section-icon"><Star size={17} /></span><div><h2 className="font-serif text-base font-bold">تقييمات العميل</h2><p className="mt-1 text-[10px] text-muted-foreground">المراجعات المنشورة من هذا الحساب.</p></div></div></div>
                <div className="space-y-3 p-3 sm:p-4">{reviews.map((review: any) => <article key={review.id} className="customer-review-card"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{review.product?.name || 'منتج المتجر'}</p><p className="mt-1 text-[9px] text-muted-foreground">{date(review.createdAt)}</p></div><span className="customer-rating" aria-label={`${review.rating} من 5`}><Star size={12} fill="currentColor" />{review.rating}/5</span></div>{review.text && <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{review.text}</p>}</article>)}{!reviews.length && <ProfileEmpty icon={Star} title="لا توجد تقييمات" description="لم يرسل هذا العميل مراجعة حتى الآن." compact />}</div>
              </section>
            </div>
          </div>
        </> : <ProfileEmpty icon={UserRound} title="تعذر عرض ملف العميل" description="تحقق من الاتصال ثم أعد المحاولة." action={<button type="button" onClick={() => void loadCustomer()} className="admin-action admin-action--gold mt-2"><RefreshCw size={14} /> إعادة المحاولة</button>} />}
      </div>
    </main>
  );
}

function ProfileEmpty({ icon: Icon, title, description, compact = false, action }: any) {
  return <div className={`profile-empty ${compact ? 'profile-empty--compact' : ''}`}><span><Icon size={21} /></span><b>{title}</b><p>{description}</p>{action}</div>;
}
