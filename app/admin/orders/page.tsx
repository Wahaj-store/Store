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
      <Link href="/admin" className="text-[var(--gold)] text-sm hover:underline inline-block mb-4">
        ‹ لوحة التحكم
      </Link>
      <h1 className="text-3xl font-semibold">الطلبات</h1>
      
      <div className="mt-6 space-y-4">
        {o.map(x => (
          <div 
            key={x.id} 
            className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-3 relative z-10"
          >
            <div className="flex justify-between items-center">
              {/* رابط نصي مباشر وصريح برقم الطلب لتجنب أي مشاكل بالضغط */}
              <Link 
                href={`/admin/orders/${x.id}`}
                className="text-[var(--gold)] font-bold text-base underline hover:opacity-80 py-1 px-2 -mx-2"
              >
                طلب #{x.number} 🔗
              </Link>
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold">
                {x.status}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              العميل: {x.customer?.name || x.customerNameSnapshot || 'زائر'} • {x.customer?.phone || x.customerPhoneSnapshot || 'بدون هاتف'}
            </p>
            
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-sm">
              <span className="font-semibold">
                الإجمالي: {Number(x.total).toLocaleString('ar-EG')} ج.م ({x.paymentMethod})
              </span>
              
              <Link 
                href={`/admin/orders/${x.id}`}
                className="px-4 py-2 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition"
              >
                إدارة الطلب ←
              </Link>
            </div>
          </div>
        ))}

        {!o.length && (
          <div className="p-8 text-center text-muted-foreground rounded-2xl border border-border">
            لا توجد طلبات حتى الآن.
          </div>
        )}
      </div>
    </main>
  );
}
