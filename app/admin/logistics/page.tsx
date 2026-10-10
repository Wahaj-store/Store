'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpLeft, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Clock3,
  ClipboardList, MapPin, PackageCheck, Plus, RefreshCw, RotateCcw, Search,
  ShieldCheck, Truck, X,
} from 'lucide-react';

type Shipment = any;
type ReturnRequest = any;
type Order = any;
type TabKey = 'pending' | 'shipments' | 'returns';

const shipmentLabels: Record<string, string> = {
  PENDING: 'قيد التجهيز', PROCESSING: 'جاري التجهيز', SHIPPED: 'تم الشحن',
  IN_TRANSIT: 'في الطريق', OUT_FOR_DELIVERY: 'خرج للتسليم', DELIVERED: 'تم التسليم',
  FAILED: 'تعذر التسليم', RETURNED: 'مرتجع للشاحن', CANCELLED: 'ملغاة',
};
const returnLabels: Record<string, string> = {
  REQUESTED: 'طلب جديد', APPROVED: 'مقبول', REJECTED: 'مرفوض',
  RECEIVED: 'تم الاستلام', REFUNDED: 'تم رد المبلغ', CANCELLED: 'مغلق',
};
const shipmentOptions = Object.entries(shipmentLabels);
const returnOptions = Object.entries(returnLabels);
const fieldClass = 'mt-1.5 h-11 w-full rounded-xl border border-border/70 bg-[var(--bg)] px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/10 disabled:opacity-50';

function statusTone(status: string) {
  if (['DELIVERED', 'APPROVED', 'RECEIVED', 'REFUNDED'].includes(status)) return 'success';
  if (['FAILED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(status)) return 'danger';
  if (['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'SHIPPED'].includes(status)) return 'gold';
  return 'muted';
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`logistics-badge logistics-badge--${statusTone(status)}`}><i />{label}</span>;
}

function MetricCard({ icon: Icon, label, value, note, tone = 'gold' }: any) {
  return (
    <article className="logistics-metric">
      <span className={`logistics-metric__icon logistics-metric__icon--${tone}`}><Icon size={19} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{note}</p>
      </div>
    </article>
  );
}

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('pending');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ provider: '', trackingNumber: '', status: 'PENDING', estimatedMinDays: '', estimatedMaxDays: '', note: '' });

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const [shipmentsRes, returnsRes] = await Promise.all([
        fetch('/api/admin/shipments?includeOrders=1', { cache: 'no-store' }),
        fetch('/api/admin/returns', { cache: 'no-store' }),
      ]);
      const shipmentsData = await shipmentsRes.json().catch(() => ({}));
      const returnsData = await returnsRes.json().catch(() => ({}));
      if (!shipmentsRes.ok) throw new Error(shipmentsData?.error || 'تعذر تحميل الشحنات.');
      if (!returnsRes.ok) throw new Error(returnsData?.error || 'تعذر تحميل المرتجعات.');
      setShipments(Array.isArray(shipmentsData) ? shipmentsData : (Array.isArray(shipmentsData?.shipments) ? shipmentsData.shipments : []));
      setPendingOrders(Array.isArray(shipmentsData?.pendingOrders) ? shipmentsData.pendingOrders : []);
      setReturns(Array.isArray(returnsData) ? returnsData : []);
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تحميل بيانات الشحن والمرتجعات.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createShipment(orderId: string) {
    setSaving(orderId);
    setMessage('');
    try {
      const payload: Record<string, any> = {
        orderId, provider: form.provider, trackingNumber: form.trackingNumber,
        status: form.status, note: form.note,
      };
      if (form.estimatedMinDays !== '') payload.estimatedMinDays = Number(form.estimatedMinDays);
      if (form.estimatedMaxDays !== '') payload.estimatedMaxDays = Number(form.estimatedMaxDays);
      const response = await fetch('/api/admin/shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر إنشاء الشحنة.');
      setCreating(null);
      setForm({ provider: '', trackingNumber: '', status: 'PENDING', estimatedMinDays: '', estimatedMaxDays: '', note: '' });
      setMessage('تم إنشاء الشحنة بنجاح.');
      setMessageTone('success');
      await load();
    } catch (error: any) {
      setMessage(error?.message || 'تعذر إنشاء الشحنة.');
      setMessageTone('error');
    } finally {
      setSaving('');
    }
  }

  async function updateShipment(id: string, status: string) {
    setSaving(id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/shipments', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحديث الشحنة.');
      setMessage('تم تحديث حالة الشحنة.');
      setMessageTone('success');
      await load();
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تحديث الشحنة.');
      setMessageTone('error');
    } finally {
      setSaving('');
    }
  }

  async function updateReturn(id: string, status: string) {
    setSaving(id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/returns', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحديث طلب الإرجاع.');
      setMessage('تم تحديث طلب الإرجاع.');
      setMessageTone('success');
      await load();
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تحديث طلب الإرجاع.');
      setMessageTone('error');
    } finally {
      setSaving('');
    }
  }

  const openShipments = shipments.filter(item => !['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'].includes(item.status)).length;
  const activeReturns = returns.filter(item => ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(item.status)).length;
  const normalizedQuery = query.trim().toLocaleLowerCase('ar');
  const matches = (value: unknown) => String(value || '').toLocaleLowerCase('ar').includes(normalizedQuery);
  const filteredOrders = useMemo(() => pendingOrders.filter(order => !normalizedQuery || [order.number, order.customerNameSnapshot, order.customerPhoneSnapshot, order.shippingGovernorate, order.shippingCity].some(matches)), [pendingOrders, normalizedQuery]);
  const filteredShipments = useMemo(() => shipments.filter(item => !normalizedQuery || [item.order?.number, item.order?.customerNameSnapshot, item.provider, item.trackingNumber, shipmentLabels[item.status]].some(matches)), [shipments, normalizedQuery]);
  const filteredReturns = useMemo(() => returns.filter(item => !normalizedQuery || [item.number, item.order?.number, item.order?.customerNameSnapshot, item.reason, returnLabels[item.status]].some(matches)), [returns, normalizedQuery]);

  const tabs = [
    { id: 'pending' as const, label: 'بانتظار الشحن', count: pendingOrders.length, icon: ClipboardList },
    { id: 'shipments' as const, label: 'الشحنات', count: shipments.length, icon: Truck },
    { id: 'returns' as const, label: 'المرتجعات', count: returns.length, icon: RotateCcw },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="logistics-hero">
          <div className="relative z-10 min-w-0">
            <Link href="/admin" className="logistics-back"><ArrowUpLeft size={14} /> لوحة الإدارة</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="logistics-hero__eyebrow"><Truck size={15} /> مركز العمليات</span>
              <span className="logistics-live"><i /> متابعة مباشرة</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">الشحن والمرتجعات</h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">تابع مسار الشحنات، جهّز الطلبات الجديدة، وأدر طلبات الإرجاع من لوحة واحدة.</p>
          </div>
          <div className="logistics-hero__actions">
            <div className="logistics-hero__shield"><ShieldCheck size={17} /><span>إدارة آمنة</span></div>
            <button type="button" onClick={() => void load()} disabled={loading} className="admin-action admin-action--secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث البيانات</button>
          </div>
          <span className="logistics-hero__watermark" aria-hidden="true">و</span>
        </header>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4" aria-label="ملخص الشحن والمرتجعات">
          <MetricCard icon={ClipboardList} label="طلبات تنتظر الشحن" value={pendingOrders.length} note="طلبات بلا شحنة مسجلة" />
          <MetricCard icon={Truck} label="شحنات قيد التنفيذ" value={openShipments} note="لم تصل إلى حالة نهائية بعد" tone="blue" />
          <MetricCard icon={RotateCcw} label="مرتجعات مفتوحة" value={activeReturns} note="بانتظار إكمال الإجراء" tone="rose" />
          <MetricCard icon={PackageCheck} label="إجمالي الشحنات" value={shipments.length} note="ضمن آخر 100 شحنة" tone="green" />
        </section>

        {message && <div role={messageTone === 'error' ? 'alert' : 'status'} className={`logistics-alert logistics-alert--${messageTone}`}>
          {messageTone === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}<span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="إغلاق الرسالة"><X size={15} /></button>
        </div>}

        <section className="logistics-panel">
          <div className="logistics-panel__header">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="logistics-panel__icon"><Truck size={17} /></span><h2 className="font-serif text-base font-bold sm:text-lg">مساحة متابعة العمليات</h2></div>
              <p className="mt-1.5 text-[11px] text-muted-foreground sm:text-xs">اختر القسم المطلوب وابحث ضمن سجلاته بسرعة.</p>
            </div>
            <label className="logistics-search">
              <Search size={16} />
              <input aria-label="بحث في العمليات" value={query} onChange={event => setQuery(event.target.value)} placeholder="بحث بالطلب أو العميل أو التتبع" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={14} /></button>}
            </label>
          </div>

          <div className="logistics-tabs" role="tablist" aria-label="أقسام الشحن والمرتجعات">
            {tabs.map(item => {
              const Icon = item.icon;
              return <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`logistics-tab ${tab === item.id ? 'is-active' : ''}`}>
                <Icon size={16} /><span>{item.label}</span><b>{item.count}</b>
              </button>;
            })}
          </div>

          {loading ? <div className="logistics-loading"><span className="logistics-spinner" /> جارٍ تحديث البيانات…</div> : (
            <div className="p-3 sm:p-5 lg:p-6">
              {tab === 'pending' && <div className="space-y-3">
                {filteredOrders.map(order => <article key={order.id} className="logistics-record">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/orders/${order.id}`} className="logistics-order-id hover:text-[var(--gold)]">{order.number}</Link><span className="logistics-inline-status"><Clock3 size={12} /> بانتظار إسناد الشحن</span></div>
                      <p className="mt-2 text-sm font-semibold">{order.customerNameSnapshot || 'عميل المتجر'}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-[var(--gold-muted)]" />{[order.shippingGovernorate, order.shippingCity].filter(Boolean).join('، ') || 'لا توجد مدينة'}</span>
                        {order.customerPhoneSnapshot && <span dir="ltr">{order.customerPhoneSnapshot}</span>}
                      </div>
                      <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">{order.shippingAddress || 'لم يتم تسجيل عنوان تفصيلي.'}</p>
                    </div>
                    <button type="button" onClick={() => { setCreating(creating === order.id ? null : order.id); setMessage(''); }} className="admin-action admin-action--gold shrink-0">
                      {creating === order.id ? <X size={16} /> : <Plus size={16} />}{creating === order.id ? 'إلغاء' : 'إنشاء شحنة'}
                    </button>
                  </div>
                  {creating === order.id && <form className="logistics-create-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void createShipment(order.id); }}>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <label className="logistics-field">شركة الشحن<input className={fieldClass} value={form.provider} onChange={event => setForm({ ...form, provider: event.target.value })} placeholder="مثال: Bosta" /></label>
                      <label className="logistics-field">رقم التتبع<input className={fieldClass} value={form.trackingNumber} onChange={event => setForm({ ...form, trackingNumber: event.target.value })} placeholder="Tracking number" dir="ltr" /></label>
                      <label className="logistics-field">الحالة الأولية<select className={fieldClass} value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{shipmentOptions.filter(([value]) => !['FAILED', 'RETURNED', 'CANCELLED'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className="logistics-field">أقل مدة متوقعة (أيام)<input className={fieldClass} type="number" min="0" value={form.estimatedMinDays} onChange={event => setForm({ ...form, estimatedMinDays: event.target.value })} placeholder="2" /></label>
                      <label className="logistics-field">أقصى مدة متوقعة (أيام)<input className={fieldClass} type="number" min="0" value={form.estimatedMaxDays} onChange={event => setForm({ ...form, estimatedMaxDays: event.target.value })} placeholder="5" /></label>
                      <label className="logistics-field sm:col-span-2 xl:col-span-1">ملاحظة<input className={fieldClass} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="ملاحظة اختيارية" /></label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
                      <p className="text-[10px] text-muted-foreground">سيتم حفظ الشحنة وربطها بهذا الطلب.</p>
                      <button type="submit" disabled={saving === order.id} className="admin-action admin-action--gold">{saving === order.id ? <span className="logistics-spinner logistics-spinner--small" /> : <CheckCircle2 size={16} />}{saving === order.id ? 'جارٍ الإنشاء…' : 'حفظ وإنشاء الشحنة'}</button>
                    </div>
                  </form>}
                </article>)}
                {!filteredOrders.length && <EmptyState icon={ClipboardList} title={query ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات بانتظار الشحن'} description={query ? 'جرّب تعديل عبارة البحث.' : 'سيظهر هنا كل طلب لا توجد له شحنة مسجلة.'} />}
              </div>}

              {tab === 'shipments' && <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>إجمالي السجلات المعروضة: {filteredShipments.length}</span><span>اختيار الحالة يحفظ التحديث مباشرة.</span></div>
                <div className="hidden overflow-x-auto rounded-2xl border border-border/60 md:block">
                  <table className="w-full min-w-[820px] text-right text-xs">
                    <thead><tr className="bg-[var(--surface)] text-muted-foreground"><th className="p-4 font-semibold">الطلب / العميل</th><th className="p-4 font-semibold">شركة الشحن</th><th className="p-4 font-semibold">رقم التتبع</th><th className="p-4 font-semibold">الحالة</th><th className="p-4 font-semibold">تحديث الحالة</th><th className="p-4 font-semibold">الأحداث</th></tr></thead>
                    <tbody>{filteredShipments.map(item => <tr key={item.id} className="border-t border-border/50 transition hover:bg-[var(--surface)]/55">
                      <td className="p-4"><Link href={item.order?.id ? `/admin/orders/${item.order.id}` : '/admin/orders'} className="font-bold hover:text-[var(--gold)]">{item.order?.number || '—'}</Link><span className="mt-1 block text-[10px] text-muted-foreground">{item.order?.customerNameSnapshot || 'عميل المتجر'}</span></td>
                      <td className="p-4">{item.provider || '—'}</td><td className="p-4 font-mono" dir="ltr">{item.trackingNumber || '—'}</td>
                      <td className="p-4"><StatusBadge status={item.status} label={shipmentLabels[item.status] || item.status} /></td>
                      <td className="p-4"><select aria-label={`تحديث حالة الشحنة ${item.order?.number || ''}`} disabled={saving === item.id} value={item.status} onChange={event => void updateShipment(item.id, event.target.value)} className={`${fieldClass} mt-0 min-w-[150px] py-0`}><option value="">اختر الحالة</option>{shipmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                      <td className="p-4"><EventDetails events={item.events} /></td>
                    </tr>)}</tbody>
                  </table>
                  {!filteredShipments.length && <EmptyState icon={Truck} title={query ? 'لا توجد نتائج مطابقة' : 'لا توجد شحنات بعد'} description="ستظهر الشحنات المنشأة في هذا القسم." />}
                </div>
                <div className="grid gap-3 md:hidden">
                  {filteredShipments.map(item => <article key={item.id} className="logistics-record">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] text-muted-foreground">رقم الطلب</p><Link href={item.order?.id ? `/admin/orders/${item.order.id}` : '/admin/orders'} className="mt-1 block font-bold hover:text-[var(--gold)]">{item.order?.number || '—'}</Link></div><StatusBadge status={item.status} label={shipmentLabels[item.status] || item.status} /></div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.order?.customerNameSnapshot || 'عميل المتجر'}</p>
                    <div className="logistics-info-grid"><Info label="شركة الشحن" value={item.provider || '—'} /><Info label="رقم التتبع" value={item.trackingNumber || '—'} ltr /></div>
                    <label className="logistics-field mt-3">تحديث الحالة<select disabled={saving === item.id} value={item.status} onChange={event => void updateShipment(item.id, event.target.value)} className={fieldClass}>{shipmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <EventDetails events={item.events} />
                  </article>)}
                  {!filteredShipments.length && <EmptyState icon={Truck} title={query ? 'لا توجد نتائج مطابقة' : 'لا توجد شحنات بعد'} description="ستظهر الشحنات المنشأة في هذا القسم." />}
                </div>
              </>}

              {tab === 'returns' && <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>إجمالي طلبات الإرجاع: {filteredReturns.length}</span><span>تُسجّل إعادة المخزون تلقائيًا عند تأكيد الاستلام.</span></div>
                <div className="hidden overflow-x-auto rounded-2xl border border-border/60 md:block">
                  <table className="w-full min-w-[760px] text-right text-xs">
                    <thead><tr className="bg-[var(--surface)] text-muted-foreground"><th className="p-4 font-semibold">رقم المرتجع</th><th className="p-4 font-semibold">الطلب / العميل</th><th className="p-4 font-semibold">السبب</th><th className="p-4 font-semibold">الحالة</th><th className="p-4 font-semibold">الإجراء</th></tr></thead>
                    <tbody>{filteredReturns.map(item => <tr key={item.id} className="border-t border-border/50 transition hover:bg-[var(--surface)]/55">
                      <td className="p-4 font-bold">{item.number || '—'}<span className="mt-1 block text-[10px] text-muted-foreground">{item.items?.length || 0} صنف</span></td>
                      <td className="p-4"><Link href={item.order?.id ? `/admin/orders/${item.order.id}` : '/admin/orders'} className="font-bold hover:text-[var(--gold)]">{item.order?.number || '—'}</Link><span className="mt-1 block text-[10px] text-muted-foreground">{item.order?.customerNameSnapshot || 'عميل المتجر'}</span></td>
                      <td className="max-w-[220px] p-4 leading-5 text-muted-foreground">{item.reason || '—'}</td>
                      <td className="p-4"><StatusBadge status={item.status} label={returnLabels[item.status] || item.status} /></td>
                      <td className="p-4"><select aria-label={`تحديث حالة المرتجع ${item.number || ''}`} disabled={saving === item.id} value={item.status} onChange={event => void updateReturn(item.id, event.target.value)} className={`${fieldClass} mt-0 min-w-[150px] py-0`}>{returnOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                    </tr>)}</tbody>
                  </table>
                  {!filteredReturns.length && <EmptyState icon={RotateCcw} title={query ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات إرجاع'} description="طلبات الإرجاع الجديدة ستظهر هنا للمراجعة." />}
                </div>
                <div className="grid gap-3 md:hidden">
                  {filteredReturns.map(item => <article key={item.id} className="logistics-record">
                    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] text-muted-foreground">رقم المرتجع</p><p className="mt-1 font-bold">{item.number || '—'}</p></div><StatusBadge status={item.status} label={returnLabels[item.status] || item.status} /></div>
                    <div className="mt-3 rounded-xl border border-border/50 bg-[var(--surface)]/70 p-3"><p className="text-[10px] text-muted-foreground">الطلب والعميل</p><Link href={item.order?.id ? `/admin/orders/${item.order.id}` : '/admin/orders'} className="mt-1 block text-xs font-semibold hover:text-[var(--gold)]">{item.order?.number || '—'} · {item.order?.customerNameSnapshot || 'عميل المتجر'}</Link></div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.reason || 'لا يوجد سبب مسجل'} <span className="mr-1 text-[10px]">· {item.items?.length || 0} صنف</span></p>
                    <label className="logistics-field mt-3">تحديث الحالة<select disabled={saving === item.id} value={item.status} onChange={event => void updateReturn(item.id, event.target.value)} className={fieldClass}>{returnOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  </article>)}
                  {!filteredReturns.length && <EmptyState icon={RotateCcw} title={query ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات إرجاع'} description="طلبات الإرجاع الجديدة ستظهر هنا للمراجعة." />}
                </div>
              </>}
            </div>
          )}
        </section>
        <p className="flex items-center justify-center gap-2 pb-2 text-center text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-[var(--gold-muted)]" /> تحديث الحالات يتم عبر واجهات الإدارة الحالية مع تسجيل أحداث الطلب.</p>
      </div>
    </main>
  );
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-medium" dir={ltr ? 'ltr' : undefined}>{value}</p></div>;
}

function EventDetails({ events }: { events?: any[] }) {
  if (!events?.length) return <span className="text-[10px] text-muted-foreground">لا توجد أحداث مسجلة</span>;
  return <details className="logistics-events"><summary><CalendarDays size={13} /> سجل الأحداث <ChevronDown size={13} /></summary><div className="mt-2 space-y-2 border-r border-[var(--gold)]/30 pr-3">{events.map((event, index) => <div key={event.id || index} className="text-[10px]"><p className="font-medium">{shipmentLabels[event.status] || event.status}</p><p className="mt-0.5 text-muted-foreground">{event.note || 'تحديث حالة الشحنة'}{event.createdAt ? ` · ${new Date(event.createdAt).toLocaleDateString('ar-EG')}` : ''}</p></div>)}</div></details>;
}

function EmptyState({ icon: Icon, title, description }: any) {
  return <div className="logistics-empty"><span><Icon size={22} /></span><b>{title}</b><p>{description}</p></div>;
}
