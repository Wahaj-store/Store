'use client';

import React, { useState } from 'react';
import { Clock, CheckCircle2, Package, User, MapPin } from 'lucide-react';

export default function AccountPage() {
  // حالة تجريبية أو البيانات الخاصة بالعميل وطلباته
  const [selectedOrder, setSelectedOrder] = useState({
    id: '1',
    status: 'PROCESSING', // يمكنك تجربة: PENDING, PROCESSING, DELIVERED
    // ... باقي بيانات الطلب
  });

  return (
    <div className="container py-10 max-w-4xl" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">حسابي الشخصي</h1>

      {/* قسم تفاصيل الطلب وخط سير الطلب */}
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Clock size={16} className="text-[var(--gold)]" /> خط سير ومتابعة الطلب
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            
            {/* الخطوة الأولى: تم استلام الطلب */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1 ${
              ['PENDING', 'NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status) 
                ? 'bg-[var(--gold)] text-black border-[var(--gold)] font-bold' 
                : 'bg-background border-border text-muted-foreground'
            }`}>
              <CheckCircle2 size={14} /> تم استلام الطلب
            </div>

            {/* الخطوة الثانية: قيد التجهيز والشحن */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1 ${
              ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status) 
                ? 'bg-[var(--gold)] text-black border-[var(--gold)] font-bold' 
                : 'bg-background border-border text-muted-foreground'
            }`}>
              قيد التجهيز والشحن
            </div>

            {/* الخطوة الثالثة: التوصيل للباب */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1 ${
              selectedOrder.status === 'DELIVERED' 
                ? 'bg-[var(--gold)] text-black border-[var(--gold)] font-bold' 
                : 'bg-background border-border text-muted-foreground'
            }`}>
              التوصيل للباب
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
