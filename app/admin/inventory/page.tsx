'use client';

import { useEffect, useMemo, useState } from 'react';

const typeLabels: Record<string, string> = {
  OPENING: 'رصيد افتتاحي',
  SALE: 'بيع',
  RESTOCK: 'توريد / زيادة',
  ADJUSTMENT: 'تسوية',
  ORDER_RELEASE: 'إلغاء طلب / إعادة',
};

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  async function load() {
    setLoading(true);
    try {
      const [productsRes, entriesRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/inventory?limit=200', { cache: 'no-store' }),
      ]);
      const productsData = await productsRes.json();
      const entriesData = await entriesRes.json();
      if (!productsRes.ok) throw new Error(productsData?.error || 'تعذر تحميل المنتجات');
      if (!entriesRes.ok) throw new Error(entriesData?.error || 'تعذر تحميل سجل المخزون');
      setProducts(Array.isArray(productsData) ? productsData : []);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (e: any) {
      setMessage(e?.message || 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function adjust() {
    setMessage('');
    const amount = Number(delta);
    if (!productId || !Number.isInteger(amount) || amount === 0) {
      setMessage('اختر المنتج وأدخل كمية صحيحة غير صفرية.');
      return;
    }
    if (!reason.trim()) {
      setMessage('سبب الحركة مطلوب.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId: variantId || null, delta: amount, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'تعذر تسجيل الحركة');
      setDelta('');
      setReason('');
      setMessage('تم تسجيل حركة المخزون بنجاح.');
      await load();
    } catch (e: any) {
      setMessage(e?.message || 'تعذر تسجيل الحركة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen py-8 px-4 md:px-8 bg-[var(--bg)] text-foreground" dir="rtl">
      <div className="container max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-xs text-[var(--gold)] hover:underline">‹ لوحة الإدارة</a>
            <h1 className="mt-3 text-3xl md:text-4xl font-serif font-bold">سجل المخزون</h1>
            <p className="mt-2 text-sm text-muted-foreground">كل تغيير في الرصيد مرتبط بسبب وحركة قابلة للمراجعة.</p>
          </div>
          <button onClick={load} className="px-4 py-2.5 rounded-xl bg-muted/10 border border-border/60 text-sm hover:border-[var(--gold)] transition">تحديث</button>
        </div>

        <section className="bg-muted/10 border border-border/40 rounded-3xl p-5 md:p-7 space-y-4">
          <h2 className="font-serif font-bold text-[var(--gold)]">تسجيل حركة يدوية</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-xs text-muted-foreground md:col-span-2">المنتج
              <select value={productId} onChange={e => { setProductId(e.target.value); setVariantId(''); }} className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground">
                <option value="">اختر المنتج</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — مخزون {p.stock}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">الخيار
              <select value={variantId} onChange={e => setVariantId(e.target.value)} disabled={!selectedProduct?.variants?.length} className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground disabled:opacity-50">
                <option value="">مخزون المنتج نفسه</option>
                {(selectedProduct?.variants || []).map((v: any) => <option key={v.id} value={v.id}>{v.name}: {v.value} — {v.stock}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">التغيير (+ / -)
              <input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="مثال: 10 أو -2" className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground" />
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الحركة" className="flex-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground" />
            <button onClick={adjust} disabled={saving} className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-bold disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'تسجيل الحركة'}</button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </section>

        <section className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-border/30"><h2 className="font-serif font-bold">آخر الحركات</h2></div>
          {loading ? <p className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3 text-start">التاريخ</th><th className="p-3 text-start">المنتج</th><th className="p-3">الحركة</th><th className="p-3">التغيير</th><th className="p-3">بعد الحركة</th><th className="p-3 text-start">السبب</th></tr></thead>
                <tbody>{entries.map((x: any) => <tr key={x.id} className="border-b border-border/20"><td className="p-3 whitespace-nowrap">{new Date(x.createdAt).toLocaleString('ar-EG')}</td><td className="p-3">{x.productNameSnapshot || x.product?.name || '—'}{x.variantNameSnapshot && <div className="text-xs text-muted-foreground">{x.variantNameSnapshot}: {x.variantValueSnapshot}</div>}</td><td className="p-3 text-center">{typeLabels[x.type] || x.type}</td><td className={`p-3 text-center font-bold ${x.quantity > 0 ? 'text-emerald-600' : x.quantity < 0 ? 'text-red-500' : ''}`}>{x.quantity > 0 ? '+' : ''}{x.quantity}</td><td className="p-3 text-center">{x.balanceAfter}</td><td className="p-3">{x.reason || '—'}</td></tr>)}</tbody>
              </table>
              {!entries.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد حركات بعد.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
