'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Orders() {
  const [o, setO] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/orders').then(r => r.json()).then(setO);
  }, []);

  return (
    <main className="container py-10" dir="rtl">
      <Link href="/admin" className="text-[var(--gold)] text-sm hover:underline inline-block">
        ‹ لوحة التحكم
      </Link>
      <h1 className="mt-5 text-3xl font-semibold">الطلبات</h1>
      
      <div className="mt-8 grid gap-3">
        {o.map(x => (
          <Link 
            key={x.id} 
            href={`/admin/orders/${x.id}`}
            className="lux-card p-5 block w-full hover:border-[var(--gold)] transition shadow-sm bg-card border border-border/60 rounded-2xl cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <b className="text-foreground">طلب #{x.number}</b>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] font-bold">
                {x.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {x.customer?.name || x.customerNameSnapshot || 'زائر'} • {x.customer?.phone || x.customerPhoneSnapshot || 'بدون هاتف'}
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {Number(x.total).toLocaleString('ar-EG')} ج.م • <span className="text-[var(--gold)]">{x.paymentMethod}</span>
            </p>
          </Link>
        ))}

        {!o.length && (
          <div className="lux-card p-8 text-center text-muted-foreground rounded-2xl border border-border/60">
            لا توجد طلبات حتى الآن.
          </div>
        )}
      </div>
    </main>
  );
}
