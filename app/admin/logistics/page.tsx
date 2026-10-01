'use client';

import { useEffect, useState } from 'react';

const shipmentLabels: Record<string, string> = { PENDING: 'قيد التجهيز', PROCESSING: 'جاري التجهيز', SHIPPED: 'تم الشحن', IN_TRANSIT: 'في الطريق', OUT_FOR_DELIVERY: 'خرج للتسليم', DELIVERED: 'تم التسليم', FAILED: 'تعذر التسليم', RETURNED: 'مرتجع للشاحن', CANCELLED: 'ملغاة' };
const returnLabels: Record<string, string> = { REQUESTED: 'جديد', APPROVED: 'مقبول', REJECTED: 'مرفوض', RECEIVED: 'تم الاستلام', REFUNDED: 'تم رد المبلغ', CANCELLED: 'ملغى' };

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState('');

  async function load() {
    setMessage('');
    const [s, r] = await Promise.all([fetch('/api/admin/shipments', { cache: 'no-store' }), fetch('/api/admin/returns', { cache: 'no-store' })]);
    const sj = await s.json(); const rj = await r.json();
    if (!s.ok) throw new Error(sj?.error || 'تعذر تحميل الشحنات');
    if (!r.ok) throw new Error(rj?.error || 'تعذر تحميل المرتجعات');
    setShipments(Array.isArray(sj) ? sj : []); setReturns(Array.isArray(rj) ? rj : []);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);

  async function updateShipment(id: string, status: string) {
    setSaving(id); setMessage('');
    try { const r = await fetch('/api/admin/shipments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'تعذر تحديث الشحنة'); await load(); } catch (e: any) { setMessage(e.message); } finally { setSaving(''); }
  }
  async function updateReturn(id: string, status: string) {
    setSaving(id); setMessage('');
    try { const r = await fetch('/api/admin/returns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'تعذر تحديث المرتجع'); await load(); } catch (e: any) { setMessage(e.message); } finally { setSaving(''); }
  }

  return <main className="min-h-screen py-8 px-4 md:px-8 bg-[var(--bg)] text-foreground" dir="rtl"><div className="container max-w-7xl mx-auto space-y-6">
    <div className="flex items-center justify-between gap-4"><div><a href="/admin" className="text-xs text-[var(--gold)] hover:underline">‹ لوحة الإدارة</a><h1 className="mt-3 text-3xl md:text-4xl font-serif font-bold">الشحن والمرتجعات</h1><p className="mt-2 text-sm text-muted-foreground">إدارة حالات الشحن وسجل الأحداث وطلبات الإرجاع دون تغيير بيانات الطلب الأصلية.</p></div><button onClick={() => load().catch(e => setMessage(e.message))} className="px-4 py-2.5 rounded-xl bg-muted/10 border border-border/60 text-sm hover:border-[var(--gold)] transition">تحديث</button></div>
    {message && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 p-4 text-sm">{message}</div>}
    <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden"><div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold text-[var(--gold)]">الشحنات</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3 text-start">الطلب</th><th className="p-3 text-start">العميل</th><th className="p-3">شركة الشحن</th><th className="p-3">التتبع</th><th className="p-3">الحالة</th><th className="p-3">تغيير</th></tr></thead><tbody>{shipments.map(x => <tr key={x.id} className="border-b border-border/20"><td className="p-3">{x.order?.number}</td><td className="p-3">{x.order?.customerNameSnapshot || '—'}</td><td className="p-3">{x.provider || '—'}</td><td className="p-3">{x.trackingNumber || '—'}</td><td className="p-3 text-center">{shipmentLabels[x.status] || x.status}</td><td className="p-3"><select disabled={saving === x.id} value={x.status} onChange={e => updateShipment(x.id, e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60"><option value="PENDING">قيد التجهيز</option><option value="PROCESSING">جاري التجهيز</option><option value="SHIPPED">تم الشحن</option><option value="IN_TRANSIT">في الطريق</option><option value="OUT_FOR_DELIVERY">خرج للتسليم</option><option value="DELIVERED">تم التسليم</option><option value="FAILED">تعذر التسليم</option><option value="RETURNED">مرتجع للشاحن</option><option value="CANCELLED">ملغاة</option></select></td></tr>)}</tbody></table>{!shipments.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد شحنات بعد.</p>}</div></section>
    <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden"><div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold text-[var(--gold)]">طلبات الإرجاع</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3 text-start">رقم المرتجع</th><th className="p-3 text-start">الطلب</th><th className="p-3">السبب</th><th className="p-3">الحالة</th><th className="p-3">تغيير</th></tr></thead><tbody>{returns.map(x => <tr key={x.id} className="border-b border-border/20"><td className="p-3">{x.number}</td><td className="p-3">{x.order?.number}</td><td className="p-3">{x.reason}</td><td className="p-3 text-center">{returnLabels[x.status] || x.status}</td><td className="p-3"><select disabled={saving === x.id} value={x.status} onChange={e => updateReturn(x.id, e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60"><option value="REQUESTED">جديد</option><option value="APPROVED">مقبول</option><option value="REJECTED">مرفوض</option><option value="RECEIVED">تم الاستلام</option><option value="REFUNDED">تم رد المبلغ</option><option value="CANCELLED">ملغى</option></select></td></tr>)}</tbody></table>{!returns.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات إرجاع بعد.</p>}</div></section>
  </div></main>;
}
