'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft, ArrowUpLeft, Banknote, CalendarDays, CheckCircle2, CircleAlert,
  Clock3, Package, RefreshCw, Search, ShoppingBag, Truck, UserRound, X,
} from 'lucide-react';

type OrderRecord = any;
type OrderFilter = 'ALL' | 'NEW' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const statusLabels: Record<string, string> = {
  NEW: 'جديد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي',
};
const paymentStatusLabels: Record<string, string> = { PENDING: 'بانتظار الدفع', CONFIRMED: 'مدفوع', FAILED: 'فشل الدفع' };
const paymentMethodLabels: Record<string, string> = { COD: 'الدفع عند الاستلام', VODAFONE_CASH: 'فودافون كاش', INSTAPAY: 'إنستاباي' };

const formatMoney = (value: unknown) => `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
const formatDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function statusTone(status: string) {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'SHIPPED') return 'blue';
  if (status === 'PROCESSING') return 'gold';
  return 'muted';
}

function OrderStatus({ status }: { status: string }) {
  return <span className={`order-status order-status--${statusTone(status)}`}><i />{statusLabels[status] || status}</span>;
}

function PaymentStatus({ status }: { status: string }) {
  const tone = status === 'CONFIRMED' ? 'success' : status === 'FAILED' ? 'danger' : 'muted';
  return <span className={`order-payment order-payment--${tone}`}>{paymentStatusLabels[status] || status || '—'}</span>;
}

function SummaryCard({ icon: Icon, label, value, note, tone = 'gold' }: any) {
  return <article className="order-summary-card"><span className={`order-summary-card__icon order-summary-card__icon--${tone}`}><Icon size={19} /></span><div className="min-w-0"><p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p><p className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">{value}</p><p className="mt-1 truncate text-[9px] text-muted-foreground sm:text-[10px]">{note}</p></div></article>;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('ALL');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders', { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحميل الطلبات.');
      if (!Array.isArray(data)) throw new Error(data?.error || 'استجابة الطلبات غير صالحة.');
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  const counts = useMemo(() => ({
    all: orders.length,
    new: orders.filter(order => order.status === 'NEW').length,
    inProgress: orders.filter(order => ['PROCESSING', 'SHIPPED'].includes(order.status)).length,
    delivered: orders.filter(order => order.status === 'DELIVERED').length,
    value: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
  }), [orders]);
  const normalizedQuery = query.trim().toLocaleLowerCase('ar');
  const visibleOrders = useMemo(() => orders.filter(order => {
    if (filter !== 'ALL' && order.status !== filter) return false;
    if (!normalizedQuery) return true;
    return [order.number, order.customer?.name, order.customerNameSnapshot, order.customer?.phone, order.customerPhoneSnapshot, order.paymentMethod]
      .some(value => String(value || '').toLocaleLowerCase('ar').includes(normalizedQuery));
  }), [orders, filter, normalizedQuery]);
  const filters: { key: OrderFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'كل الطلبات', count: orders.length },
    { key: 'NEW', label: 'جديدة', count: counts.new },
    { key: 'PROCESSING', label: 'قيد التجهيز', count: orders.filter(order => order.status === 'PROCESSING').length },
    { key: 'SHIPPED', label: 'تم الشحن', count: orders.filter(order => order.status === 'SHIPPED').length },
    { key: 'DELIVERED', label: 'تم التسليم', count: counts.delivered },
    { key: 'CANCELLED', label: 'ملغاة', count: orders.filter(order => order.status === 'CANCELLED').length },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="order-page-hero">
          <div className="relative z-10 min-w-0">
            <Link href="/admin" className="order-page-back"><ArrowUpLeft size={14} /> لوحة الإدارة</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="order-page-hero__eyebrow"><ShoppingBag size={15} /> إدارة المبيعات</span><span className="order-page-live"><i /> أحدث الطلبات</span></div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">إدارة الطلبات</h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">تابع الطلب من لحظة إنشائه حتى التسليم، وافتح التفاصيل لإدارة حالته وخط سيره.</p>
          </div>
          <div className="order-page-hero__actions"><span className="order-page-hero__secure"><CheckCircle2 size={16} /> عمليات محفوظة</span><button type="button" onClick={() => void loadOrders()} disabled={loading} className="admin-action admin-action--secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث القائمة</button></div>
          <span className="order-page-hero__watermark" aria-hidden="true">ط</span>
        </header>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4" aria-label="ملخص الطلبات">
          <SummaryCard icon={Package} label="الطلبات المعروضة" value={counts.all.toLocaleString('ar-EG')} note="أحدث 100 طلب" />
          <SummaryCard icon={Clock3} label="طلبات جديدة" value={counts.new.toLocaleString('ar-EG')} note="بانتظار بدء التجهيز" tone="blue" />
          <SummaryCard icon={Truck} label="قيد التنفيذ" value={counts.inProgress.toLocaleString('ar-EG')} note="تجهيز أو شحن" tone="gold" />
          <SummaryCard icon={Banknote} label="إجمالي قيمتها" value={formatMoney(counts.value)} note="مجموع الطلبات المعروضة" tone="green" />
        </section>

        {error && <div role="alert" className="orders-alert"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="إغلاق الرسالة"><X size={15} /></button></div>}

        <section className="orders-workspace">
          <div className="orders-workspace__head"><div className="min-w-0"><div className="flex items-center gap-2"><span className="orders-section-icon"><Package size={17} /></span><h2 className="font-serif text-base font-bold sm:text-lg">قائمة الطلبات</h2></div><p className="mt-1.5 text-[10px] text-muted-foreground sm:text-xs">اختر حالة أو ابحث برقم الطلب وبيانات العميل.</p></div><span className="orders-count">{visibleOrders.length.toLocaleString('ar-EG')} نتيجة</span></div>
          <div className="orders-toolbar"><label className="orders-search"><Search size={16} /><input aria-label="البحث في الطلبات" value={query} onChange={event => setQuery(event.target.value)} placeholder="رقم الطلب أو اسم العميل أو الهاتف" />{query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={14} /></button>}</label></div>
          <div className="orders-filters" role="tablist" aria-label="تصفية حسب الحالة">{filters.map(item => <button key={item.key} role="tab" aria-selected={filter === item.key} type="button" onClick={() => setFilter(item.key)} className={`orders-filter ${filter === item.key ? 'is-active' : ''}`}><span>{item.label}</span><b>{item.count}</b></button>)}</div>

          {loading ? <div className="orders-loading"><span className="orders-spinner" /> جارٍ تحميل الطلبات…</div> : (
            <>
              <div className="hidden overflow-x-auto lg:block"><table className="orders-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>التاريخ</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التفاصيل</th></tr></thead><tbody>
                {visibleOrders.map(order => <tr key={order.id}>
                  <td><Link href={`/admin/orders/${order.id}`} className="order-number">#{order.number}</Link><span className="mt-1 block text-[10px] text-muted-foreground">{order.items?.length || 0} منتج</span></td>
                  <td><div className="flex items-center gap-2"><span className="order-avatar"><UserRound size={15} /></span><div className="min-w-0"><p className="max-w-[180px] truncate font-semibold">{order.customer?.name || order.customerNameSnapshot || 'زائر'}</p><p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">{order.customer?.phone || order.customerPhoneSnapshot || '—'}</p></div></div></td>
                  <td className="whitespace-nowrap text-muted-foreground">{formatDate(order.createdAt)}</td>
                  <td><OrderStatus status={order.status} /></td>
                  <td><div className="space-y-1.5"><PaymentStatus status={order.paymentStatus} /><span className="block text-[9px] text-muted-foreground">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod || '—'}</span></div></td>
                  <td className="whitespace-nowrap font-bold text-[var(--gold-muted)]">{formatMoney(order.total)}</td>
                  <td><Link href={`/admin/orders/${order.id}`} className="order-open-link">إدارة <ArrowDownLeft size={14} /></Link></td>
                </tr>)}
              </tbody></table></div>
              <div className="grid gap-3 p-3 lg:hidden sm:p-4">
                {visibleOrders.map(order => <article key={order.id} className="order-mobile-card">
                  <div className="flex items-start justify-between gap-3"><div><Link href={`/admin/orders/${order.id}`} className="order-number">#{order.number}</Link><p className="mt-1 text-[9px] text-muted-foreground"><CalendarDays size={11} className="ml-1 inline" />{formatDate(order.createdAt)}</p></div><OrderStatus status={order.status} /></div>
                  <div className="mt-3 flex items-center gap-2.5 border-y border-border/50 py-3"><span className="order-avatar"><UserRound size={15} /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{order.customer?.name || order.customerNameSnapshot || 'زائر'}</p><p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">{order.customer?.phone || order.customerPhoneSnapshot || '—'}</p></div></div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[9px] text-muted-foreground">الإجمالي · {order.items?.length || 0} منتج</p><p className="mt-1 text-sm font-bold text-[var(--gold-muted)]">{formatMoney(order.total)}</p></div><div className="text-left"><PaymentStatus status={order.paymentStatus} /><p className="mt-1 text-[9px] text-muted-foreground">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod || '—'}</p></div></div>
                  <Link href={`/admin/orders/${order.id}`} className="order-mobile-action">فتح تفاصيل الطلب <ArrowDownLeft size={15} /></Link>
                </article>)}
              </div>
              {!visibleOrders.length && <div className="orders-empty"><span><ShoppingBag size={22} /></span><b>{orders.length ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات مسجلة'}</b><p>{orders.length ? 'غيّر البحث أو حالة الطلب لإظهار نتائج أخرى.' : 'ستظهر الطلبات الجديدة هنا بعد تسجيلها في المتجر.'}</p>{error && <button type="button" onClick={() => void loadOrders()} className="admin-action admin-action--gold mt-2">إعادة المحاولة</button>}</div>}
            </>
          )}
        </section>
        <p className="flex items-center justify-center gap-2 pb-2 text-center text-[10px] text-muted-foreground"><CheckCircle2 size={13} className="text-[var(--gold-muted)]" /> تحديث الحالة وخط سير الطلب متاحان من صفحة تفاصيل كل طلب.</p>
      </div>
    </main>
  );
}
