'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Orders() {
  const [o, setO] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/orders').then(r => r.json()).then(setO);
  }, []);

  return (
    <main className="container py-10" dir="rtl">
      <button 
        onClick={() => router.push('/admin')} 
        className="text-[var(--gold)] text-sm hover:underline bg-transparent border-none cursor-pointer p-0"
      >
        ‹ لوحة التحكم
      </button>
      <h1 className="mt-5 text-3xl font-semibold">الطلبات</h1>
      
      <div className="mt-8 grid gap-4">
        {o.map(x => (
          <div 
            key={x.id} 
            className="lux-card p-5 bg-card border border-border/60 rounded-2xl shadow-sm space-y-3"
          >
            <div className="flex justify-between items-center">
              <b className="text-foreground text-base">طلب #{x.number}</b>
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold">
                {x.status}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {x.customer?.name || x.customerNameSnapshot || 'زائر'} • {x.customer?.phone || x.customerPhoneSnapshot || 'بدون هاتف'}
            </p>
            
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <span className="text-sm font-semibold text-foreground">
                {Number(x.total).toLocaleString('ar-EG')} ج.م • <span className="text-[var(--gold)]">{x.paymentMethod}</span>
              </span>
              
              {/* زر صريح وبارز للتحكم وعرض الطلب يضمن فتحه فوراً على الجوال */}
              <button
                onClick={() => router.push(`/admin/orders/${x.id}`)}
                className="px-4 py-2 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition shadow-sm cursor-pointer"
              >
                إدارة الطلب وخط السير ←
              </button>
            </div>
          </div>
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
