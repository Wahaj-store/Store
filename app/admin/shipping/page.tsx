'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpLeft, Check, CheckCircle2, CircleAlert, Edit3, MapPin, Plus,
  RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Truck, Wallet, X,
} from 'lucide-react';

type ShippingZone = any;
const fieldClass = 'h-11 w-full rounded-xl border border-border/70 bg-[var(--bg)] px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/10';
const money = (value: unknown) => `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;

function ZoneMetric({ icon: Icon, label, value, note, tone = 'gold' }: any) {
  return <article className="shipping-metric"><span className={`shipping-metric__icon shipping-metric__icon--${tone}`}><Icon size={19} /></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{note}</p></div></article>;
}

export default function AdminShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editFreeAbove, setEditFreeAbove] = useState('');
  const [newGov, setNewGov] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newFreeAbove, setNewFreeAbove] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyZone, setBusyZone] = useState('');
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  async function fetchZones() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shipping', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر تحميل مناطق الشحن.');
      setZones(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setNotice({ tone: 'error', text: error?.message || 'تعذر تحميل مناطق الشحن.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchZones(); }, []);

  function startEdit(zone: ShippingZone) {
    setEditingId(zone.id);
    setEditPrice(String(zone.price ?? ''));
    setEditFreeAbove(zone.freeAbove == null ? '' : String(zone.freeAbove));
    setNotice(null);
  }

  async function handleSave(id: string) {
    setBusyZone(id);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/shipping', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: editPrice, freeAbove: editFreeAbove }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'فشل تحديث منطقة الشحن.');
      setEditingId(null);
      await fetchZones();
      setNotice({ tone: 'success', text: 'تم حفظ أسعار منطقة الشحن.' });
    } catch (error: any) {
      setNotice({ tone: 'error', text: error?.message || 'حدث خطأ أثناء التحديث.' });
    } finally {
      setBusyZone('');
    }
  }

  async function handleDelete(zone: ShippingZone) {
    if (!confirm(`هل أنت متأكد من حذف منطقة ${zone.governorate}؟`)) return;
    setBusyZone(zone.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/shipping?id=${encodeURIComponent(zone.id)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: zone.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر حذف منطقة الشحن.');
      await fetchZones();
      setNotice({ tone: 'success', text: `تم حذف منطقة ${zone.governorate}.` });
    } catch (error: any) {
      setNotice({ tone: 'error', text: error?.message || 'حدث خطأ أثناء الحذف.' });
    } finally {
      setBusyZone('');
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/shipping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governorate: newGov, price: newPrice, freeAbove: newFreeAbove }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر إضافة المحافظة. ربما تكون مسجلة مسبقًا.');
      setNewGov(''); setNewPrice(''); setNewFreeAbove(''); setShowAddModal(false);
      await fetchZones();
      setNotice({ tone: 'success', text: 'تمت إضافة منطقة الشحن الجديدة.' });
    } catch (error: any) {
      setNotice({ tone: 'error', text: error?.message || 'حدث خطأ أثناء الإضافة.' });
    } finally {
      setSaving(false);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('ar');
  const filteredZones = useMemo(() => zones.filter(zone => !normalizedQuery || String(zone.governorate || '').toLocaleLowerCase('ar').includes(normalizedQuery)), [zones, normalizedQuery]);
  const avgPrice = zones.length ? Math.round(zones.reduce((sum, zone) => sum + Number(zone.price || 0), 0) / zones.length) : 0;
  const freeShippingZones = zones.filter(zone => zone.freeAbove != null && zone.freeAbove !== '').length;

  const actions = (zone: ShippingZone) => editingId === zone.id ? (
    <div className="flex items-center gap-2">
      <button type="button" disabled={busyZone === zone.id} onClick={() => void handleSave(zone.id)} className="shipping-icon-button shipping-icon-button--save" aria-label={`حفظ ${zone.governorate}`} title="حفظ">{busyZone === zone.id ? <span className="shipping-spinner" /> : <Check size={16} />}</button>
      <button type="button" disabled={busyZone === zone.id} onClick={() => setEditingId(null)} className="shipping-icon-button" aria-label="إلغاء التعديل" title="إلغاء"><X size={16} /></button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => startEdit(zone)} className="shipping-icon-button" aria-label={`تعديل ${zone.governorate}`} title="تعديل"><Edit3 size={15} /></button>
      <button type="button" disabled={busyZone === zone.id} onClick={() => void handleDelete(zone)} className="shipping-icon-button shipping-icon-button--delete" aria-label={`حذف ${zone.governorate}`} title="حذف">{busyZone === zone.id ? <span className="shipping-spinner" /> : <Trash2 size={15} />}</button>
    </div>
  );

  const priceCell = (zone: ShippingZone) => editingId === zone.id ? <input type="number" min="0" value={editPrice} onChange={event => setEditPrice(event.target.value)} className={`${fieldClass} w-full sm:max-w-[140px]`} aria-label={`سعر شحن ${zone.governorate}`} /> : <span className="shipping-price">{money(zone.price)}</span>;
  const freeCell = (zone: ShippingZone) => editingId === zone.id ? <input type="number" min="0" value={editFreeAbove} onChange={event => setEditFreeAbove(event.target.value)} className={`${fieldClass} w-full sm:max-w-[150px]`} placeholder="اختياري" aria-label={`حد الشحن المجاني ${zone.governorate}`} /> : zone.freeAbove != null && zone.freeAbove !== '' ? <span>{money(zone.freeAbove)}</span> : <span className="text-muted-foreground">غير محدد</span>;

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-5 text-foreground sm:px-5 sm:py-7 lg:px-8" dir="rtl">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
        <header className="shipping-hero">
          <div className="relative z-10 min-w-0"><Link href="/admin" className="shipping-back"><ArrowUpLeft size={14} /> لوحة الإدارة</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="shipping-hero__eyebrow"><Truck size={15} /> إعدادات التوصيل</span><span className="shipping-live"><i /> مناطق الشحن</span></div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">أسعار الشحن للمحافظات</h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">اضبط تكلفة التوصيل والحد الأدنى للاستفادة من الشحن المجاني لكل محافظة.</p>
          </div>
          <div className="shipping-hero__actions"><span className="shipping-hero__shield"><ShieldCheck size={17} /> إعدادات محفوظة بأمان</span><button type="button" onClick={() => setShowAddModal(true)} className="admin-action admin-action--gold"><Plus size={16} /> إضافة محافظة</button></div>
          <span className="shipping-hero__watermark" aria-hidden="true">ش</span>
        </header>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3" aria-label="ملخص أسعار الشحن">
          <ZoneMetric icon={MapPin} label="مناطق الشحن" value={zones.length.toLocaleString('ar-EG')} note="المحافظات المسجلة حاليًا" />
          <ZoneMetric icon={Wallet} label="متوسط تكلفة التوصيل" value={money(avgPrice)} note="متوسط الأسعار لجميع المناطق" tone="blue" />
          <ZoneMetric icon={Sparkles} label="شحن مجاني من حد معين" value={freeShippingZones.toLocaleString('ar-EG')} note="مناطق لها حد مجاني محدد" tone="green" />
        </section>

        {notice && <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`shipping-alert shipping-alert--${notice.tone}`}>
          {notice.tone === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}<span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="إغلاق الرسالة"><X size={15} /></button>
        </div>}

        <section className="shipping-zones">
          <div className="shipping-zones__head"><div className="min-w-0"><div className="flex items-center gap-2"><span className="shipping-section-icon"><MapPin size={17} /></span><h2 className="font-serif text-base font-bold sm:text-lg">قائمة مناطق التوصيل</h2></div><p className="mt-1.5 text-[11px] text-muted-foreground">تعديلات الأسعار تنعكس على حساب تكلفة الشحن في المتجر.</p></div><span className="shipping-count">{filteredZones.length} محافظة</span></div>
          <div className="shipping-toolbar"><label className="shipping-search"><Search size={16} /><input aria-label="بحث عن محافظة" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن محافظة…" />{query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={14} /></button>}</label><button type="button" onClick={() => void fetchZones()} disabled={loading} className="admin-action admin-action--secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button></div>
          {loading ? <div className="shipping-loading"><span className="shipping-spinner shipping-spinner--large" /> جارٍ تحميل مناطق الشحن…</div> : <>
            <div className="hidden overflow-x-auto lg:block"><table className="shipping-table"><thead><tr><th>المحافظة</th><th>تكلفة الشحن</th><th>الشحن المجاني عند</th><th>الإجراءات</th></tr></thead><tbody>
              {filteredZones.map(zone => <tr key={zone.id}><td><span className="shipping-governorate"><MapPin size={14} />{zone.governorate}</span></td><td>{priceCell(zone)}</td><td>{freeCell(zone)}</td><td>{actions(zone)}</td></tr>)}
            </tbody></table></div>
            <div className="grid gap-3 p-3 lg:hidden sm:p-4">
              {filteredZones.map(zone => <article key={zone.id} className="shipping-zone-card">
                <div className="flex items-center justify-between gap-3"><span className="shipping-governorate text-sm"><MapPin size={15} />{zone.governorate}</span>{actions(zone)}</div>
                <div className="shipping-zone-card__values"><label className="shipping-zone-value"><span>تكلفة الشحن</span>{priceCell(zone)}</label><label className="shipping-zone-value"><span>الشحن المجاني عند</span>{freeCell(zone)}</label></div>
              </article>)}
            </div>
            {!filteredZones.length && <div className="shipping-empty"><span><MapPin size={22} /></span><b>{query ? 'لم نعثر على محافظة مطابقة' : 'لا توجد مناطق شحن'}</b><p>{query ? 'جرّب البحث باسم آخر.' : 'أضف أول محافظة لتحديد تكلفة التوصيل.'}</p>{!query && <button type="button" onClick={() => setShowAddModal(true)} className="admin-action admin-action--gold mt-2"><Plus size={15} /> إضافة محافظة</button>}</div>}
          </>}
        </section>
        <p className="flex items-center justify-center gap-2 pb-2 text-center text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-[var(--gold-muted)]" /> يتم حفظ أسعار المناطق عبر إعدادات الشحن الحالية للمتجر.</p>
      </div>

      {showAddModal && <div className="shipping-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowAddModal(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="shipping-add-title" className="shipping-modal">
          <div className="shipping-modal__head"><div className="flex items-center gap-3"><span className="shipping-section-icon"><Plus size={17} /></span><div><h2 id="shipping-add-title" className="font-serif text-lg font-bold">إضافة محافظة</h2><p className="mt-1 text-[10px] text-muted-foreground">أدخل تكلفة التوصيل والحد المجاني إن وجد.</p></div></div><button type="button" onClick={() => setShowAddModal(false)} className="shipping-icon-button" aria-label="إغلاق النافذة"><X size={17} /></button></div>
          <form onSubmit={handleAdd} className="grid gap-4 p-4 sm:p-5">
            <label className="shipping-field">اسم المحافظة<input autoFocus required value={newGov} onChange={event => setNewGov(event.target.value)} placeholder="مثال: الإسكندرية" className={fieldClass} /></label>
            <label className="shipping-field">تكلفة الشحن (ج.م)<input required type="number" min="0" value={newPrice} onChange={event => setNewPrice(event.target.value)} placeholder="60" className={fieldClass} /></label>
            <label className="shipping-field">الشحن المجاني عند (اختياري)<input type="number" min="0" value={newFreeAbove} onChange={event => setNewFreeAbove(event.target.value)} placeholder="مثال: 1000" className={fieldClass} /></label>
            {notice?.tone === 'error' && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{notice.text}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-border/50 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowAddModal(false)} className="admin-action admin-action--secondary">إلغاء</button><button type="submit" disabled={saving} className="admin-action admin-action--gold">{saving ? <span className="shipping-spinner" /> : <CheckCircle2 size={15} />}{saving ? 'جارٍ الحفظ…' : 'حفظ المحافظة'}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}
