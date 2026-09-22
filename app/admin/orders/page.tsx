'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Clock, User, Phone, CreditCard, ChevronLeft, Sparkles } from 'lucide-react';

export default function Orders() {
  const [o, setO] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/orders').then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setO(data);
    });
  }, []);

  // دالة مساعدة لتلوين وترجمة حالة الطلب بشكل أنيق
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">جديد</span>;
      case 'PROCESSING':
        return <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">قيد التجهيز</span>;
      case 'SHIPPED':
        return <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">تم الشحن</span>;
      case 'DELIVERED':
        return <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">تم التسليم</span>;
      case 'CANCELLED':
        return <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/20">ملغي</span>;
      default:
        return <span className="text-xs px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold">{status}</span>;
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 md:px-8 bg-background text-foreground" dir="rtl">
      <div className="container max-w-5xl mx-auto space-y-6">
        
        {/* الترويسة */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <Link href="/admin" className="text-[var(--gold)] text-xs font-semibold hover:underline inline-flex items-center gap-1">
              ‹ العودة للوحة التحكم
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="text-[var(--gold)]" size={28} /> إدارة الطلبات
            </h1>
          </div>
          <span className="text-xs px-3.5 py-1.5 rounded-xl bg-card border border-border font-medium text-muted-foreground">
            إجمالي الطلبات: {o.length}
          </span>
        </div>
        
        {/* قائمة الطلبات */}
        <div className="grid gap-4">
          {o.map(x => (
            <div 
              key={x.id} 
              className="p-5 bg-card border border-border/80 rounded-3xl shadow-sm space-y-4 hover:border-[var(--gold)]/60 transition duration-300"
            >
              {/* الصف العلوي: رقم الطلب والحالة */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
                  <Link 
                    href={`/admin/orders/${x.id}`}
                    className="text-[var(--gold)] font-bold text-base hover:underline"
                  >
                    طلب #{x.number}
                  </Link>
                </div>
                {getStatusBadge(x.status)}
              </div>
              
              {/* بيانات العميل */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground bg-background/50 p-3 rounded-2xl border border-border/40">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[var(--gold)] shrink-0" />
                  <span className="font-semibold text-foreground">{x.customer?.name || x.customerNameSnapshot || 'زائر'}</span>
                </div>
                <div className="flex items-center gap-2" dir="ltr">
                  <span>{x.customer?.phone || x.customerPhoneSnapshot || 'بدون هاتف'}</span>
                  <Phone size={14} className="text-[var(--gold)] shrink-0" />
                </div>
              </div>
              
              {/* الصف السفلي: الإجمالي وطريقة الدفع وزر الإدارة */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground block">إجمالي المبلغ وطريقة الدفع</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)] font-bold text-base">
                      {Number(x.total).toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-muted border border-border/60 text-muted-foreground">
                      {x.paymentMethod}
                    </span>
                  </div>
                </div>
                
                <Link 
                  href={`/admin/orders/${x.id}`}
                  className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-90 transition shadow-sm flex items-center gap-1.5"
                >
                  <span>إدارة الطلب وتغيير الحالة</span>
                  <ChevronLeft size={16} />
                </Link>
              </div>

            </div>
          ))}

          {!o.length && (
            <div className="p-16 text-center text-muted-foreground rounded-3xl border border-border bg-card space-y-3">
              <Sparkles size={32} className="mx-auto text-[var(--gold)] opacity-50" />
              <p className="text-sm font-medium">لا توجد طلبات مسجلة حتى الآن.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
