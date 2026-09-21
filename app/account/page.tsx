'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Package, User, MapPin, ShoppingBag, Heart, LogOut } from 'lucide-react';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // جلب طلبات العضو (مثال تفاعلي أو جلب من الـ API الخاص بك)
  useEffect(() => {
    // يمكنك ربطها بالـ API الفعلي لديك لجلب طلبات العميل
    setLoading(false);
  }, []);

  return (
    <div className="container py-10 max-w-5xl" dir="rtl">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold">حسابي الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-1">مرحباً بكِ، اتبعي طلباتك وإدارة حسابك بكل سهولة.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        {/* القائمة الجانبية */}
        <div className="space-y-2 md:col-span-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'orders' 
                ? 'bg-[var(--gold)] text-black font-bold shadow-sm' 
                : 'bg-muted/30 hover:bg-muted/60 text-foreground'
            }`}
          >
            <Package size={18} /> طلبياتي
          </button>
          
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'wishlist' 
                ? 'bg-[var(--gold)] text-black font-bold shadow-sm' 
                : 'bg-muted/30 hover:bg-muted/60 text-foreground'
            }`}
          >
            <Heart size={18} /> المفضلة
          </button>
        </div>

        {/* محتوى الصفحة الرئيسي */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">سجل الطلبات</h2>
              
              {selectedOrder ? (
                <div className="space-y-4 p-5 rounded-2xl border border-border/60 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">تفاصيل الطلب #{selectedOrder.id}</span>
                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs text-[var(--gold)] hover:underline font-semibold"
                    >
                      العودة للطلبات
                    </button>
                  </div>

                  {/* خط سير ومتابعة الطلب المتصل بالحالة */}
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
              ) : (
                <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl p-6">
                  <ShoppingBag size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">ليس لديك أي طلبات مسجلة حتى الآن، أو يتم تحميل البيانات...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">المنتجات المفضلة</h2>
              <p className="text-sm text-muted-foreground">قائمة المنتجات التي قمتِ بإضافتها للمفضلة ستظهر هنا.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
