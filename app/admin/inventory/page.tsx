'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpLeft, ArrowDownRight, ArrowUpRight, Boxes, CheckCircle2, CircleAlert,
  Clock3, Package, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  TrendingDown, TrendingUp, X,
} from 'lucide-react';

type LedgerEntry = any;
type Product = any;
type FilterType = 'ALL' | 'OPENING' | 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'ORDER_RELEASE';
const typeLabels: Record<string, string> = {
  OPENING: 'رصيد افتتاحي', SALE: 'بيع', RESTOCK: 'توريد / زيادة',
  ADJUSTMENT: 'تسوية', ORDER_RELEASE: 'إلغاء طلب / إعادة',
};
const fieldClass = 'mt-1.5 h-12 w-full rounded-xl border border-border/70 bg-[var(--bg)] px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/10 disabled:cursor-not-allowed disabled:opacity-55';

function InventoryMetric({ icon: Icon, label, value, note, tone = 'gold' }: any) {
  return <article className="inventory-metric"><span className={`inventory-metric__icon inventory-metric__icon--${tone}`}><Icon size={19} /></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{note}</p></div></article>;
}

function MovementBadge({ type }: { type: string }) {
  const positive = ['OPENING', 'RESTOCK', 'ORDER_RELEASE'].includes(type);
  return <span className={`inventory-type-badge ${positive ? 'inventory-type-badge--positive' : type === 'SALE' ? 'inventory-type-badge--negative' : 'inventory-type-badge--neutral'}`}>
    {positive ? <TrendingUp size={13} /> : type === 'SALE' ? <TrendingDown size={13} /> : <SlidersHorizontal size={13} />}{typeLabels[type] || type}
  </span>;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');

  const selectedProduct = useMemo(() => products.find(product => product.id === productId), [products, productId]);

  async function load() {
    setLoading(true);
    try {
      const [productsRes, entriesRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/inventory?limit=200', { cache: 'no-store' }),
      ]);
      const productsData = await productsRes.json().catch(() => []);
      const entriesData = await entriesRes.json().catch(() => []);
      if (!productsRes.ok) throw new Error(productsData?.error || 'تعذر تحميل المنتجات.');
      if (!entriesRes.ok) throw new Error(entriesData?.error || 'تعذر تحميل سجل المخزون.');
      setProducts(Array.isArray(productsData) ? productsData : []);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تحميل بيانات المخزون.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function adjust(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const amount = Number(delta);
    if (!productId || !Number.isInteger(amount) || amount === 0) {
      setMessage('اختر المنتج وأدخل كمية صحيحة غير صفرية.');
      setMessageTone('error');
      return;
    }
    if (!reason.trim()) {
      setMessage('سبب الحركة مطلوب حتى يسهل الرجوع إليها لاحقًا.');
      setMessageTone('error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId: variantId || null, delta: amount, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تسجيل حركة المخزون.');
      setDelta('');
      setReason('');
      await load();
      setMessage('تم تسجيل حركة المخزون بنجاح.');
      setMessageTone('success');
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تسجيل الحركة.');
      setMessageTone('error');
    } finally {
      setSaving(false);
    }
  }

  const totalUnits = products.reduce((sum, product) => sum + Math.max(0, Number(product.stock) || 0), 0);
  const lowStockCount = products.filter(product => Number(product.stock) >= 0 && Number(product.stock) <= 5).length;
  const addedUnits = entries.reduce((sum, entry) => sum + (Number(entry.quantity) > 0 ? Number(entry.quantity) : 0), 0);
  const removedUnits = entries.reduce((sum, entry) => sum + (Number(entry.quantity) < 0 ? Math.abs(Number(entry.quantity)) : 0), 0);
  const normalizedQuery = query.trim().toLocaleLowerCase('ar');
  const visibleEntries = useMemo(() => entries.filter(entry => {
    const matchesType = typeFilter === 'ALL' || entry.type === typeFilter;
    const matchesQuery = !normalizedQuery || [entry.productNameSnapshot, entry.product?.name, entry.variantNameSnapshot, entry.variantValueSnapshot, entry.reason, entry.order?.number, typeLabels[entry.type]].some(value => String(value || '').toLocaleLowerCase('ar').includes(normalizedQuery));
    return matchesType && matchesQuery;
  }), [entries, typeFilter, normalizedQuery]);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="inventory-hero">
          <div className="relative z-10 min-w-0">
            <Link href="/admin" className="inventory-back"><ArrowUpLeft size={14} /> لوحة الإدارة</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="inventory-hero__eyebrow"><Boxes size={15} /> مراقبة المخزون</span><span className="inventory-live"><i /> سجل موثق</span></div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">سجل المخزون</h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">سجّل التوريدات والتسويات، وراجع أثر كل حركة على رصيد المنتجات بوضوح.</p>
          </div>
          <div className="inventory-hero__actions"><span className="inventory-hero__shield"><ShieldCheck size={17} /> سجل قابل للمراجعة</span><button type="button" onClick={() => void load()} disabled={loading} className="admin-action admin-action--secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث البيانات</button></div>
          <span className="inventory-hero__watermark" aria-hidden="true">م</span>
        </header>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4" aria-label="ملخص المخزون">
          <InventoryMetric icon={Package} label="عدد المنتجات" value={products.length} note="المنتجات المتاحة للإدارة" />
          <InventoryMetric icon={Boxes} label="إجمالي الوحدات" value={totalUnits.toLocaleString('ar-EG')} note="الرصيد المسجل للمنتجات" tone="blue" />
          <InventoryMetric icon={ArrowUpRight} label="وحدات مضافة" value={addedUnits.toLocaleString('ar-EG')} note="ضمن آخر 200 حركة" tone="green" />
          <InventoryMetric icon={ArrowDownRight} label="وحدات منصرفة" value={removedUnits.toLocaleString('ar-EG')} note={`منتجات منخفضة الرصيد: ${lowStockCount}`} tone="rose" />
        </section>

        {message && <div role={messageTone === 'error' ? 'alert' : 'status'} className={`inventory-alert inventory-alert--${messageTone}`}>
          {messageTone === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}<span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="إغلاق الرسالة"><X size={15} /></button>
        </div>}

        <section className="inventory-workspace">
          <div className="inventory-workspace__heading"><div><span className="inventory-section-icon"><Plus size={17} /></span></div><div className="min-w-0 flex-1"><h2 className="font-serif text-base font-bold sm:text-lg">تسجيل حركة مخزون</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">أدخل الزيادة أو النقصان مع سبب واضح؛ يُسجل الرصيد الجديد تلقائيًا.</p></div><span className="inventory-workspace__manual"><ShieldCheck size={14} /> صلاحية إدارة المخزون</span></div>
          <form onSubmit={adjust} className="p-4 sm:p-5 lg:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="inventory-field sm:col-span-2">المنتج
                <select value={productId} onChange={event => { setProductId(event.target.value); setVariantId(''); }} className={fieldClass}>
                  <option value="">اختر المنتج المطلوب</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} — رصيد {Number(product.stock || 0).toLocaleString('ar-EG')}</option>)}
                </select>
              </label>
              <label className="inventory-field">الخيار / النسخة
                <select value={variantId} onChange={event => setVariantId(event.target.value)} disabled={!selectedProduct?.variants?.length} className={fieldClass}>
                  <option value="">مخزون المنتج نفسه</option>{(selectedProduct?.variants || []).map((variant: any) => <option key={variant.id} value={variant.id}>{variant.name}: {variant.value} — رصيد {Number(variant.stock || 0).toLocaleString('ar-EG')}</option>)}
                </select>
              </label>
              <label className="inventory-field">الكمية (+ إضافة / − خصم)
                <input type="number" step="1" value={delta} onChange={event => setDelta(event.target.value)} placeholder="مثال: 10 أو -2" className={fieldClass} dir="ltr" inputMode="numeric" />
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="inventory-field">سبب الحركة<input value={reason} onChange={event => setReason(event.target.value)} placeholder="مثال: توريد فاتورة رقم…" className={fieldClass} maxLength={500} /></label>
              <button type="submit" disabled={saving || loading} className="admin-action admin-action--gold h-12 w-full sm:w-auto sm:min-w-[172px]">{saving ? <span className="inventory-spinner" /> : <CheckCircle2 size={16} />}{saving ? 'جارٍ التسجيل…' : 'تسجيل الحركة'}</button>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">تُحفظ الحركة ضمن سجل المخزون، ولا يمكن تسجيل كمية صفرية.</p>
          </form>
        </section>

        <section className="inventory-history">
          <div className="inventory-history__head"><div className="min-w-0"><div className="flex items-center gap-2"><span className="inventory-section-icon"><Clock3 size={17} /></span><h2 className="font-serif text-base font-bold sm:text-lg">سجل الحركات</h2></div><p className="mt-1.5 text-[11px] text-muted-foreground">أحدث {Math.min(entries.length, 200).toLocaleString('ar-EG')} حركة مسجلة.</p></div><span className="inventory-history__count">{visibleEntries.length.toLocaleString('ar-EG')} حركة</span></div>
          <div className="inventory-filters">
            <label className="inventory-search"><Search size={16} /><input aria-label="بحث في سجل المخزون" value={query} onChange={event => setQuery(event.target.value)} placeholder="بحث بالمنتج أو السبب أو الطلب" />{query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={14} /></button>}</label>
            <label className="inventory-filter-select"><span>نوع الحركة</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as FilterType)}><option value="ALL">كل الحركات</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          {loading ? <div className="inventory-loading"><span className="inventory-spinner inventory-spinner--large" /> جارٍ تحميل سجل المخزون…</div> : <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="inventory-table"><thead><tr><th>التاريخ والوقت</th><th>المنتج / الخيار</th><th>نوع الحركة</th><th>التغيير</th><th>الرصيد بعدها</th><th>السبب / المرجع</th></tr></thead>
                <tbody>{visibleEntries.map(entry => <tr key={entry.id}>
                  <td className="whitespace-nowrap">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td><p className="font-semibold text-foreground">{entry.productNameSnapshot || entry.product?.name || 'منتج غير معروف'}</p>{(entry.variantNameSnapshot || entry.variant?.name) && <p className="mt-1 text-[10px] text-muted-foreground">{entry.variantNameSnapshot || entry.variant?.name}: {entry.variantValueSnapshot || entry.variant?.value}</p>}</td>
                  <td><MovementBadge type={entry.type} /></td>
                  <td><span className={`inventory-quantity ${Number(entry.quantity) > 0 ? 'is-positive' : Number(entry.quantity) < 0 ? 'is-negative' : ''}`} dir="ltr">{Number(entry.quantity) > 0 ? '+' : ''}{Number(entry.quantity).toLocaleString('ar-EG')}</span></td>
                  <td><span className="inventory-balance">{Number(entry.balanceAfter).toLocaleString('ar-EG')}</span></td>
                  <td><p className="max-w-[240px] leading-5">{entry.reason || '—'}</p>{entry.order?.number && <p className="mt-1 text-[10px] text-muted-foreground">طلب {entry.order.number}</p>}</td>
                </tr>)}</tbody>
              </table>
              {!visibleEntries.length && <InventoryEmpty hasQuery={Boolean(query || typeFilter !== 'ALL')} />}
            </div>
            <div className="grid gap-3 p-3 lg:hidden sm:p-4">
              {visibleEntries.map(entry => <article key={entry.id} className="inventory-entry-card">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'تاريخ غير متوفر'}</p><p className="mt-1 truncate text-sm font-bold">{entry.productNameSnapshot || entry.product?.name || 'منتج غير معروف'}</p>{(entry.variantNameSnapshot || entry.variant?.name) && <p className="mt-1 text-[10px] text-muted-foreground">{entry.variantNameSnapshot || entry.variant?.name}: {entry.variantValueSnapshot || entry.variant?.value}</p>}</div><span className={`inventory-quantity ${Number(entry.quantity) > 0 ? 'is-positive' : Number(entry.quantity) < 0 ? 'is-negative' : ''}`} dir="ltr">{Number(entry.quantity) > 0 ? '+' : ''}{Number(entry.quantity).toLocaleString('ar-EG')}</span></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><MovementBadge type={entry.type} /><span className="inventory-balance">الرصيد بعدها: {Number(entry.balanceAfter).toLocaleString('ar-EG')}</span></div>
                {(entry.reason || entry.order?.number) && <div className="mt-3 rounded-xl bg-[var(--surface)]/70 p-3 text-[11px] leading-5 text-muted-foreground">{entry.reason || '—'}{entry.order?.number && <span className="mr-2">· طلب {entry.order.number}</span>}</div>}
              </article>)}
              {!visibleEntries.length && <InventoryEmpty hasQuery={Boolean(query || typeFilter !== 'ALL')} />}
            </div>
          </>}
        </section>
        <p className="flex items-center justify-center gap-2 pb-2 text-center text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-[var(--gold-muted)]" /> كل حركة مرتبطة بسبب، ويُحدّث الرصيد عبر نظام المخزون.</p>
      </div>
    </main>
  );
}

function InventoryEmpty({ hasQuery }: { hasQuery: boolean }) {
  return <div className="inventory-empty"><span><Package size={22} /></span><b>{hasQuery ? 'لا توجد حركات مطابقة' : 'لا توجد حركات مخزون بعد'}</b><p>{hasQuery ? 'غيّر عوامل البحث أو نوع الحركة.' : 'ستظهر هنا حركات البيع والتوريد والتسوية.'}</p></div>;
}
