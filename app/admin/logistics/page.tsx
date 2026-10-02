'use client';

import { useEffect, useState } from 'react';

const shipmentLabels: Record<string, string> = { PENDING: 'قيد التجهيز', PROCESSING: 'جاري التجهيز', SHIPPED: 'تم الشحن', IN_TRANSIT: 'في الطريق', OUT_FOR_DELIVERY: 'خرج للتسليم', DELIVERED: 'تم التسليم', FAILED: 'تعذر التسليم', RETURNED: 'مرتجع للشاحن', CANCELLED: 'ملغاة' };
const returnLabels: Record<string, string> = { REQUESTED: 'جديد', APPROVED: 'مقبول', REJECTED: 'مرفوض', RECEIVED: 'تم الاستلام', REFUNDED: 'تم رد المبلغ', CANCELLED: 'ملغى' };

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: '', trackingNumber: '', status: 'PENDING', estimatedMinDays: '', estimatedMaxDays: '', note: '' });

  async function load() {
    setMessage('');
    const [s, r] = await Promise.all([fetch('/api/admin/shipments?includeOrders=1', { cache: 'no-store' }), fetch('/api/admin/returns', { cache: 'no-store' })]);
    const sj = await s.json(); const rj = await r.json();
    if (!s.ok) throw new Error(sj?.error || 'تعذر تحميل الشحنات');
    if (!r.ok) throw new Error(rj?.error || 'تعذر تحميل المرتجعات');
    setShipments(Array.isArray(sj) ? sj : (Array.isArray(sj?.shipments) ? sj.shipments : []));
    setPendingOrders(Array.isArray(sj?.pendingOrders) ? sj.pendingOrders : []);
    setReturns(Array.isArray(rj) ? rj : []);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);

  async function createShipment(orderId: string) {
    setSaving(orderId); setMessage('');
    try {
      const payload: any = { orderId, provider: form.provider, trackingNumber: form.trackingNumber, status: form.status, note: form.note };
      if (form.estimatedMinDays !== '') payload.estimatedMinDays = Number(form.estimatedMinDays);
      if (form.estimatedMaxDays !== '') payload.estimatedMaxDays = Number(form.estimatedMaxDays);
      const r = await fetch('/api/admin/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'تعذر إنشاء الشحنة');
      setCreating(null);
      setForm({ provider: '', trackingNumber: '', status: 'PENDING', estimatedMinDays: '', estimatedMaxDays: '', note: '' });
      await load();
    } catch (e: any) { setMessage(e.message); } finally { setSaving(''); }
  }

  async function updateShipment(id: string, status: string) {
    setSaving(id); setMessage('');
    try { const r = await fetch('/api/admin/shipments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'تعذر تحديث الشحنة'); await load(); } catch (e: any) { setMessage(e.message); } finally { setSaving(''); }
  }
  async function updateReturn(id: string, status: string) {
    setSaving(id); setMessage('');
    try { const r = await fetch('/api/admin/returns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'تعذر تحديث المرتجع'); await load(); } catch (e: any) { setMessage(e.message); } finally { setSaving(''); }
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60 text-sm focus:outline-none focus:border-[var(--gold)]';

  return <main className="min-h-screen py-8 px-4 md:px-8 bg-[var(--bg)] text-foreground" dir="rtl"><div className="container max-w-7xl mx-auto space-y-6">
    <div className="flex items-center justify-between gap-4"><div><a href="/admin" className="text-xs text-[var(--gold)] hover:underline">‹ لوحة الإدارة</a><h1 className="mt-3 text-3xl md:text-4xl font-serif font-bold">الشحن والمرتجعات</h1><p className="mt-2 text-sm text-muted-foreground">إدارة إنشاء الشحنات وحالاتها وسجل الأحداث وطلبات الإرجاع دون تغيير بيانات الطلب الأصلية.</p></div><button onClick={() => load().catch(e => setMessage(e.message))} className="px-4 py-2.5 rounded-xl bg-muted/10 border border-border/60 text-sm hover:border-[var(--gold)] transition">تحديث</button></div>
    {message && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 p-4 text-sm">{message}</div>}

    <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden"><div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold text-[var(--gold)]">طلبات بانتظار إنشاء شحنة</h2></div><div className="overflow-x-auto">
      {pendingOrders.length ? <div className="divide-y divide-border/20">{pendingOrders.map(o => <div key={o.id} className="p-5 space-y-4"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-bold">{o.number}</div><div className="text-xs text-muted-foreground mt-1">{o.customerNameSnapshot || '—'} · {o.customerPhoneSnapshot || '—'} · {o.shippingGovernorate || '—'}{o.shippingCity ? `، ${o.shippingCity}` : ''}</div><div className="text-xs text-muted-foreground mt-1">{o.shippingAddress || 'لا يوجد عنوان'}</div></div><button type="button" onClick={() => setCreating(creating === o.id ? null : o.id)} className="px-4 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-sm font-bold hover:opacity-95 transition">{creating === o.id ? 'إلغاء' : 'إنشاء شحنة'}</button></div>
        {creating === o.id && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-4 rounded-2xl bg-[var(--bg)] border border-border/40"><label className="text-xs text-muted-foreground">شركة الشحن<input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className={inputClass} placeholder="مثال: Bosta" /></label><label className="text-xs text-muted-foreground">رقم التتبع<input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} className={inputClass} placeholder="Tracking number" dir="ltr" /></label><label className="text-xs text-muted-foreground">الحالة<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="PENDING">قيد التجهيز</option><option value="PROCESSING">جاري التجهيز</option><option value="SHIPPED">تم الشحن</option><option value="IN_TRANSIT">في الطريق</option><option value="OUT_FOR_DELIVERY">خرج للتسليم</option><option value="DELIVERED">تم التسليم</option></select></label><label className="text-xs text-muted-foreground">أقل مدة متوقعة<input type="number" min="0" value={form.estimatedMinDays} onChange={e => setForm({ ...form, estimatedMinDays: e.target.value })} className={inputClass} placeholder="مثال: 2" /></label><label className="text-xs text-muted-foreground">أقصى مدة متوقعة<input type="number" min="0" value={form.estimatedMaxDays} onChange={e => setForm({ ...form, estimatedMaxDays: e.target.value })} className={inputClass} placeholder="مثال: 5" /></label><label className="text-xs text-muted-foreground md:col-span-2 lg:col-span-3">ملاحظة<input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="ملاحظة اختيارية" /></label><div className="md:col-span-2 lg:col-span-3 flex justify-end"><button type="button" disabled={saving === o.id} onClick={() => createShipment(o.id)} className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-sm font-bold disabled:opacity-50">{saving === o.id ? 'جارٍ الإنشاء...' : 'حفظ وإنشاء الشحنة'}</button></div></div>}
      </div>)}</div> : <p className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات بانتظار إنشاء شحنة.</p>}
    </div></section>

    <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden"><div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold text-[var(--gold)]">الشحنات</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3 text-start">الطلب</th><th className="p-3 text-start">العميل</th><th className="p-3">شركة الشحن</th><th className="p-3">التتبع</th><th className="p-3">الحالة</th><th className="p-3">تغيير</th></tr></thead><tbody>{shipments.map(x => <tr key={x.id} className="border-b border-border/20"><td className="p-3">{x.order?.number}</td><td className="p-3">{x.order?.customerNameSnapshot || '—'}</td><td className="p-3">{x.provider || '—'}</td><td className="p-3">{x.trackingNumber || '—'}</td><td className="p-3 text-center">{shipmentLabels[x.status] || x.status}</td><td className="p-3"><select disabled={saving === x.id} value={x.status} onChange={e => updateShipment(x.id, e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60"><option value="PENDING">قيد التجهيز</option><option value="PROCESSING">جاري التجهيز</option><option value="SHIPPED">تم الشحن</option><option value="IN_TRANSIT">في الطريق</option><option value="OUT_FOR_DELIVERY">خرج للتسليم</option><option value="DELIVERED">تم التسليم</option><option value="FAILED">تعذر التسليم</option><option value="RETURNED">مرتجع للشاحن</option><option value="CANCELLED">ملغاة</option></select></td></tr>)}</tbody></table>{!shipments.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد شحنات منشأة بعد.</p>}</div></section>

    <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden"><div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold text-[var(--gold)]">طلبات الإرجاع</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3 text-start">رقم المرتجع</th><th className="p-3 text-start">الطلب</th><th className="p-3">السبب</th><th className="p-3">الحالة</th><th className="p-3">تغيير</th></tr></thead><tbody>{returns.map(x => <tr key={x.id} className="border-b border-border/20"><td className="p-3">{x.number}</td><td className="p-3">{x.order?.number}</td><td className="p-3">{x.reason}</td><td className="p-3 text-center">{returnLabels[x.status] || x.status}</td><td className="p-3"><select disabled={saving === x.id} value={x.status} onChange={e => updateReturn(x.id, e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60"><option value="REQUESTED">جديد</option><option value="APPROVED">مقبول</option><option value="REJECTED">مرفوض</option><option value="RECEIVED">تم الاستلام</option><option value="REFUNDED">تم رد المبلغ</option><option value="CANCELLED">ملغى</option></select></td></tr>)}</tbody></table>{!returns.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات إرجاع بعد.</p>}</div></section>
  </div></main>;
}
