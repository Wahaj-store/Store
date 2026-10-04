"use client";

import { useState } from 'react';
import Image from 'next/image';
import {
  Heart, Package, UserRound, LogOut, Save, Sparkles, Lock, MapPin, Eye, Clock,
  CheckCircle2, ChevronLeft, Trash2, XCircle, Truck, PackageCheck, MessageSquareText, RotateCcw
} from 'lucide-react';

export default function AccountDashboardView(props: any) {
  const {
    c, setC, logout, tab, setTab, setSelectedOrder, selectedOrder, recentProducts,
    passwords, setPasswords, msg, setMsg, showAddressForm, setShowAddressForm,
    addressFormMsg, setAddressFormMsg, load, getTimelineDate, changePassword,
  } = props;

  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('DAMAGED');
  const [returnNote, setReturnNote] = useState('');
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnMsg, setReturnMsg] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const returnReasons = [
    ['DAMAGED', 'المنتج تالف'],
    ['WRONG_ITEM', 'تم استلام منتج خاطئ'],
    ['NOT_AS_DESCRIBED', 'المنتج غير مطابق للوصف'],
    ['SIZE_ISSUE', 'مشكلة في المقاس'],
    ['CHANGED_MIND', 'تغيير الرأي'],
    ['OTHER', 'سبب آخر'],
  ];

  const returnStatusLabels: Record<string, string> = {
    REQUESTED: 'قيد المراجعة',
    APPROVED: 'تمت الموافقة',
    REJECTED: 'مرفوض',
    RECEIVED: 'تم استلام المرتجع',
    REFUNDED: 'تم رد المبلغ',
    CANCELLED: 'ملغي',
  };

  async function openOrder(order: any) {
    setSelectedOrder(order);
    setReturnFormOpen(false);
    setReturnMsg('');
    setReturnReason('DAMAGED');
    setReturnNote('');
    setReturnItems({});
    setReturnRequest(null);

    if (order?.status !== 'DELIVERED') return;

    setReturnLoading(true);
    try {
      const res = await fetch(`/api/returns?orderNumber=${encodeURIComponent(order.number)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReturnRequest(data.returnRequest || null);
      }
    } catch {
      // لا نمنع عرض تفاصيل الطلب إذا تعذر تحميل حالة المرتجع.
    } finally {
      setReturnLoading(false);
    }
  }

  function toggleReturnItem(item: any) {
    setReturnItems(prev => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = 1;
      return next;
    });
  }

  function setReturnQuantity(item: any, value: number) {
    const quantity = Math.max(1, Math.min(item.quantity, Math.trunc(value) || 1));
    setReturnItems(prev => ({ ...prev, [item.id]: quantity }));
  }

  async function submitReturnRequest() {
    if (!selectedOrder || !c?.phone) return;
    const items = Object.entries(returnItems).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
    if (!items.length) {
      setReturnMsg('اختاري منتجًا واحدًا على الأقل للإرجاع.');
      return;
    }

    setReturnBusy(true);
    setReturnMsg('');
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderNumber: selectedOrder.number,
          phone: c.phone,
          reason: returnReason,
          note: returnNote,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر إرسال طلب الإرجاع');

      setReturnFormOpen(false);
      setReturnItems({});
      setReturnNote('');
      setReturnRequest({
        number: data.number,
        status: data.status,
        reason: returnReason,
        note: returnNote || null,
        requestedAt: new Date().toISOString(),
      });
      setReturnMsg('تم إرسال طلب الإرجاع بنجاح.');
    } catch (error: any) {
      setReturnMsg(error?.message || 'تعذر إرسال طلب الإرجاع');
    } finally {
      setReturnBusy(false);
    }
  }

  const canStartReturn = selectedOrder?.status === 'DELIVERED' && (!returnRequest || ['REJECTED', 'CANCELLED'].includes(returnRequest.status));

  return (
    <main className="wahaj-account-dashboard min-h-screen py-12 px-4 md:px-8 bg-[var(--bg)] text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-6xl mx-auto space-y-8">
        
        {/* الترويسة العلوية */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <span className="text-[var(--gold)] font-medium text-xs uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={16} /> لوحة التحكم 
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold">مرحبًا بكِ، {c.name}</h1>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted/10 border border-border/60 text-foreground hover:border-red-500/50 hover:text-red-500 transition text-sm font-medium shadow-xs"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* تخطيط الصفحة */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* القائمة الجانبية */}
          <aside className="w-full bg-muted/10 border border-border/40 rounded-3xl p-3 shadow-xs space-y-1.5">
            {[
              ['profile', 'حسابي والبيانات', UserRound],
              ['orders', 'الطلبات ومتابعتها', Package],
              ['addresses', 'العناوين المحفوظة', MapPin],
              ['wishlist', 'المفضلة', Heart],
              ['recent', 'المنتجات التي شاهدتها', Eye],
              ['security', 'تغيير كلمة المرور', Lock],
            ].map(([k, t, I]: any) => (
              <button
                key={k}
                onClick={() => { setTab(k); setSelectedOrder(null); setReturnRequest(null); setReturnFormOpen(false); }}
                className={`w-full flex items-center gap-3 p-3.5 text-start rounded-2xl text-sm font-medium transition-all ${
                  tab === k
                    ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[var(--bg)]/60'
                }`}
              >
                <I size={18} className="shrink-0" />
                <span className="flex-1">{t}</span>
                <ChevronLeft size={16} className={tab === k ? 'text-[var(--gold-contrast)]' : 'text-muted-foreground'} />
              </button>
            ))}

            <div className="pt-3 border-t border-border/30">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 p-3.5 text-start rounded-2xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut size={18} className="shrink-0" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </aside>

          {/* محتوى التبويبات */}
          <section className="w-full space-y-6">
            
            {tab === 'profile' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <h2 className="text-xl font-serif font-bold border-b border-border/30 pb-4">البيانات الشخصية</h2>
                
                <div className="space-y-4 max-w-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">الاسم الكامل</label>
                    <input
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      value={c.name || ''}
                      onChange={e => setC({ ...c, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">رقم الهاتف</label>
                    <input
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      value={c.phone || ''}
                      dir="ltr"
                      readOnly
                      aria-describedby="primary-phone-note"
                    />
                    <p id="primary-phone-note" className="text-[10px] text-muted-foreground">رقم الهاتف الأساسي مرتبط بالحساب ولا يمكن تغييره من هذه الصفحة.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">رقم هاتف إضافي (اختياري)</label>
                    <input
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      value={c.secondaryPhone || ''}
                      dir="ltr"
                      onChange={e => setC({ ...c, secondaryPhone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">البريد الإلكتروني</label>
                    <input
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      value={c.email || ''}
                      dir="ltr"
                      onChange={e => setC({ ...c, email: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-md hover:opacity-95 transition"
                  onClick={async () => {
                    const response = await fetch('/api/customer/me', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ name: c.name, email: c.email, secondaryPhone: c.secondaryPhone }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      setMsg(data.error || 'تعذر حفظ التغييرات');
                      return;
                    }
                    setC((current: any) => ({ ...current, ...data }));
                    setMsg('تم حفظ التغييرات بنجاح');
                    setTimeout(() => setMsg(''), 3000);
                  }}
                >
                  <Save size={16} />
                  <span>حفظ التغييرات</span>
                </button>

                {msg && <p className="text-sm text-[var(--gold)] font-medium pt-2">{msg}</p>}
              </div>
            )}

            {tab === 'orders' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                {selectedOrder ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/30 pb-4">
                      <div>
                        <h2 className="text-xl font-serif font-bold">تفاصيل الطلب: #{selectedOrder.number}</h2>
                        <span className="text-xs text-muted-foreground font-light">حالة الطلب الحالية: <b className="text-[var(--gold)]">{selectedOrder.status}</b></span>
                      </div>
                      <button 
                        onClick={() => { setSelectedOrder(null); setReturnRequest(null); setReturnFormOpen(false); }}
                        className="px-4 py-2 rounded-xl bg-[var(--bg)] border border-border/60 text-xs font-medium hover:border-[var(--gold)] transition shadow-xs"
                      >
                        العودة للطلبات
                      </button>
                    </div>

                    {selectedOrder.notes && (
                      <div className="p-4 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 space-y-1.5 shadow-xs">
                        <span className="font-serif font-bold text-xs text-[var(--gold)] flex items-center gap-1.5">
                          <MessageSquareText size={16} /> ملاحظة من الإدارة على الطلب:
                        </span>
                        <p className="text-xs md:text-sm text-foreground/90 leading-relaxed font-light">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <div className="p-5 rounded-2xl bg-[var(--bg)] border border-border/60 space-y-4 shadow-xs">
                      <h3 className="font-serif font-bold text-sm flex items-center gap-2 text-[var(--gold)]">
                        <Clock size={16} /> خط سير ومتابعة الطلب
                      </h3>

                      {selectedOrder.status === 'CANCELLED' ? (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                          <XCircle size={28} className="mx-auto text-red-500" />
                          <h4 className="font-serif font-bold text-sm text-red-500">تم إلغاء هذا الطلب</h4>
                          <p className="text-xs text-muted-foreground font-light">عذراً، تم إلغاء الطلب من قبل الإدارة أو بناءً على رغبتك.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs font-medium">
                          
                          <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-xs ${
                            ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border/60 text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={14} /> تم استلام الطلب
                            </div>
                            <span className="text-[10px] opacity-75 font-light" dir="ltr">
                              {getTimelineDate('NEW') || getTimelineDate('PENDING') || '-'}
                            </span>
                          </div>

                          <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-xs ${
                            ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border/60 text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Package size={14} /> قيد التجهيز
                            </div>
                            <span className="text-[10px] opacity-75 font-light" dir="ltr">
                              {getTimelineDate('PROCESSING') || '-'}
                            </span>
                          </div>

                          <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-xs ${
                            ['SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border/60 text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Truck size={14} /> تم الشحن
                            </div>
                            <span className="text-[10px] opacity-75 font-light" dir="ltr">
                              {getTimelineDate('SHIPPED') || '-'}
                            </span>
                          </div>

                          <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-xs ${
                            selectedOrder.status === 'DELIVERED'
                              ? 'bg-[var(--gold)] text-[var(--gold-contrast)] border-[var(--gold)] font-bold'
                              : 'border-border/60 text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <PackageCheck size={14} /> تم التسليم
                            </div>
                            <span className="text-[10px] opacity-75 font-light" dir="ltr">
                              {getTimelineDate('DELIVERED') || '-'}
                            </span>
                          </div>

                        </div>
                      )}

                      {(selectedOrder.shippingProvider || selectedOrder.trackingNumber) && (
                        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/50 text-xs flex flex-wrap justify-between gap-2 mt-3 shadow-xs">
                          {selectedOrder.shippingProvider && <span><b>شركة الشحن:</b> {selectedOrder.shippingProvider}</span>}
                          {selectedOrder.trackingNumber && <span dir="ltr"><b>رقم التتبع:</b> {selectedOrder.trackingNumber}</span>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-serif font-bold text-sm">المنتجات في هذا الطلب</h3>
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3.5 rounded-2xl bg-[var(--bg)] border border-border/60 text-sm shadow-xs">
                          <span>{item.name || item.product?.name || 'منتج'} × {item.quantity}</span>
                          <span className="text-[var(--gold)] font-bold">{Number(item.price).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      ))}
                    </div>

                    {selectedOrder.status === 'DELIVERED' && (
                      <div className="rounded-2xl border border-border/60 bg-[var(--bg)] p-5 space-y-4 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-serif font-bold text-sm flex items-center gap-2">
                              <RotateCcw size={17} className="text-[var(--gold)]" /> طلب إرجاع
                            </h3>
                            <p className="text-xs text-muted-foreground font-light mt-1">يمكنك طلب إرجاع المنتجات من هذا الطلب بعد التسليم.</p>
                          </div>
                          {returnLoading && <span className="text-xs text-muted-foreground">جاري التحقق...</span>}
                        </div>

                        {returnRequest && (
                          <div className="p-4 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-serif font-bold text-sm">طلب {returnRequest.number}</span>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold">
                                {returnStatusLabels[returnRequest.status] || returnRequest.status}
                              </span>
                            </div>
                            {returnRequest.adminNote && <p className="text-xs text-muted-foreground leading-relaxed">ملاحظة الإدارة: {returnRequest.adminNote}</p>}
                          </div>
                        )}

                        {returnMsg && (
                          <p className={`text-xs font-medium ${returnMsg.includes('بنجاح') ? 'text-[var(--gold)]' : 'text-red-500'}`}>
                            {returnMsg}
                          </p>
                        )}

                        {canStartReturn && !returnFormOpen && (
                          <button
                            type="button"
                            onClick={() => { setReturnFormOpen(true); setReturnMsg(''); }}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold shadow-md hover:opacity-95 transition"
                          >
                            <RotateCcw size={16} />
                            تقديم طلب إرجاع
                          </button>
                        )}

                        {returnFormOpen && (
                          <div className="space-y-5 border-t border-border/30 pt-5">
                            <div>
                              <h4 className="font-serif font-bold text-sm mb-3">اختاري المنتجات المراد إرجاعها</h4>
                              <div className="space-y-2">
                                {(selectedOrder.items || []).map((item: any) => {
                                  const selectedQuantity = returnItems[item.id] || 0;
                                  return (
                                    <div key={item.id} className={`rounded-2xl border p-3.5 transition ${selectedQuantity ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-border/60'}`}>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={selectedQuantity > 0}
                                          onChange={() => toggleReturnItem(item)}
                                          className="w-4 h-4 accent-[var(--gold)] shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{item.name || 'منتج'}</p>
                                          <p className="text-[11px] text-muted-foreground mt-0.5">الكمية المطلوبة في الطلب: {item.quantity}</p>
                                        </div>
                                        {selectedQuantity > 0 && item.quantity > 1 && (
                                          <input
                                            type="number"
                                            min={1}
                                            max={item.quantity}
                                            value={selectedQuantity}
                                            onChange={e => setReturnQuantity(item, Number(e.target.value))}
                                            className="w-20 px-2 py-2 rounded-xl bg-[var(--bg)] border border-border/60 text-xs text-center"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-semibold">سبب الإرجاع</label>
                              <select
                                value={returnReason}
                                onChange={e => setReturnReason(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-sm text-foreground focus:outline-none focus:border-[var(--gold)]"
                              >
                                {returnReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-semibold">ملاحظة إضافية (اختياري)</label>
                              <textarea
                                value={returnNote}
                                onChange={e => setReturnNote(e.target.value)}
                                maxLength={1000}
                                rows={4}
                                placeholder="اكتبي أي تفاصيل تساعدنا في مراجعة طلب الإرجاع..."
                                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-sm text-foreground resize-none focus:outline-none focus:border-[var(--gold)]"
                              />
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => { setReturnFormOpen(false); setReturnMsg(''); }}
                                className="px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium text-muted-foreground"
                                disabled={returnBusy}
                              >
                                إلغاء
                              </button>
                              <button
                                type="button"
                                onClick={submitReturnRequest}
                                disabled={returnBusy}
                                className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold shadow-sm disabled:opacity-60"
                              >
                                {returnBusy ? 'جاري الإرسال...' : 'إرسال طلب الإرجاع'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-border/30 pt-4 font-serif font-bold text-base">
                      <span>الإجمالي الكلي</span>
                      <span className="text-[var(--gold)] text-lg">{Number(selectedOrder.total).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-xl font-serif font-bold border-b border-border/30 pb-4">سجل الطلبات ومتابعتها</h2>
                    <div className="grid gap-3">
                      {(c.orders || []).map((o: any) => (
                        <div
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-4 p-4.5 rounded-2xl bg-[var(--bg)] border border-border/65 hover:border-[var(--gold)]/50 transition shadow-xs"
                        >
                          <div className="space-y-1">
                            <b className="text-foreground font-serif">طلب #{o.number}</b>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] font-medium">
                                {o.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <strong className="text-[var(--gold)] text-base font-serif">
                              {Number(o.total).toLocaleString('ar-EG')} ج.م
                            </strong>
                            <button
                              onClick={() => openOrder(o)}
                              className="px-4 py-2 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold hover:opacity-95 transition shadow-xs"
                            >
                              التفاصيل والمتابعة
                            </button>
                            {o.status === 'DELIVERED' && (
                              <button
                                type="button"
                                onClick={() => openOrder(o).then(() => setReturnFormOpen(true))}
                                className="px-4 py-2 rounded-xl bg-[var(--bg)] border border-[var(--gold)]/50 text-[var(--gold)] text-xs font-serif font-bold hover:bg-[var(--gold)]/10 transition shadow-xs"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <RotateCcw size={14} />
                                  طلب إرجاع
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!c.orders?.length && (
                        <p className="text-muted-foreground text-sm py-12 text-center font-light">لا توجد طلبات سابقة حتى الآن.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'addresses' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <div className="flex justify-between items-center border-b border-border/30 pb-4">
                  <h2 className="text-xl font-serif font-bold">عناوين الشحن المحفوظة</h2>
                  <button 
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="px-4 py-2.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold hover:opacity-95 transition shadow-xs"
                  >
                    {showAddressForm ? 'إلغاء' : '+ إضافة عنوان جديد'}
                  </button>
                </div>

                {/* نموذج إضافة العنوان الجديد داخل الصفحة */}
                {showAddressForm && (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setAddressFormMsg('');
                      const formData = new FormData(e.currentTarget);
                      const payload = {
                        label: formData.get('label'),
                        name: formData.get('name'),
                        phone: formData.get('phone'),
                        secondaryPhone: formData.get('secondaryPhone'),
                        governorate: formData.get('governorate'),
                        city: formData.get('city'),
                        address: formData.get('address'),
                        notes: formData.get('notes'),
                        isDefault: formData.get('isDefault') === 'on'
                      };

                      try {
                        const res = await fetch('/api/customer/addresses', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'فشل حفظ العنوان');
                        
                        load();
                        setShowAddressForm(false);
                        setMsg('تم إضافة العنوان بنجاح');
                        setTimeout(() => setMsg(''), 3000);
                      } catch (err: any) {
                        setAddressFormMsg(err.message);
                      }
                    }}
                    className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--gold)]/40 space-y-4 text-xs shadow-sm"
                  >
                    <h3 className="font-serif font-bold text-sm text-[var(--gold)]">تفاصيل عنوان الشحن الجديد</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">مسمى العنوان (مثال: المنزل، العمل)</label>
                        <input name="label" defaultValue="المنزل" required className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">اسم المستلم</label>
                        <input name="name" defaultValue={c.name || ''} required className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">رقم الهاتف الأساسي</label>
                        <input name="phone" defaultValue={c.phone || ''} required dir="ltr" className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">رقم هاتف إضافي (اختياري)</label>
                        <input name="secondaryPhone" dir="ltr" className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">المحافظة</label>
                        <input name="governorate" placeholder="القاهرة، الجيزة..." required className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium text-muted-foreground">المدينة / المركز</label>
                        <input name="city" placeholder="مدينة نصر، الهرم..." required className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-muted-foreground">العنوان بالتفصيل</label>
                      <input name="address" placeholder="اسم الشارع، رقم العمارة، رقم الشقة" required className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-muted-foreground">ملاحظات للتوصيل (اختياري)</label>
                      <input name="notes" placeholder="علامة مميزة بجوار المنزل" className="w-full px-3.5 py-3 rounded-xl bg-muted/10 border border-border/60 text-foreground text-xs shadow-xs" />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input type="checkbox" name="isDefault" id="isDefault" className="w-4 h-4 accent-[var(--gold)]" />
                      <label htmlFor="isDefault" className="cursor-pointer font-light">تعيين كعنوان أساسي للشحن</label>
                    </div>

                    {addressFormMsg && <p className="text-red-500 font-medium">{addressFormMsg}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-muted-foreground font-medium"
                      >
                        إلغاء
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold shadow-sm"
                      >
                        حفظ العنوان
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid gap-4">
                  {(c.addresses || []).map((addr: any) => (
                    <div key={addr.id} className="p-4.5 rounded-2xl bg-[var(--bg)] border border-border/60 flex items-start justify-between gap-4 shadow-xs">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-foreground">{addr.label || 'عنوان'}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-bold">
                              الأساسي
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs font-light">
                          {addr.governorate} - {addr.city} - {addr.address}
                        </p>
                        <span className="text-[var(--gold)] text-xs font-medium block pt-1" dir="ltr">
                          المستلم: {addr.name} | الهاتف: {addr.phone}
                        </span>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!confirm('هل أنت متأكد من حذف هذا العنوان؟')) return;
                          try {
                            const res = await fetch(`/api/customer/addresses/${addr.id}`, {
                              method: 'DELETE',
                              credentials: 'include',
                            });
                            if (!res.ok) throw new Error('فشل حذف العنوان');
                            load();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="text-red-500 hover:text-red-600 transition p-1"
                        title="حذف العنوان"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {(!c.addresses || c.addresses.length === 0) && !showAddressForm && (
                    <p className="text-muted-foreground text-sm text-center py-8 font-light">
                      لا توجد عناوين محفوظة حالياً. أضف عنوانك لتسهيل عملية الطلب القادمة.
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <h2 className="text-xl font-serif font-bold border-b border-border/30 pb-4">قائمة المفضلة</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(c.wishlist || []).map((w: any) => (
                    <a
                      href={`/product/${w.product.slug}`}
                      key={w.id}
                      className="group p-3 rounded-2xl bg-[var(--bg)] border border-border/60 hover:border-[var(--gold)]/50 transition space-y-2 block shadow-xs"
                    >
                      <Image
                        className="aspect-square w-full object-cover rounded-xl"
                        src={w.product.images?.[0]?.url || '/placeholder.svg'}
                        alt={w.product.name}
                        width={600}
                        height={600}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <p className="text-sm font-medium group-hover:text-[var(--gold)] transition line-clamp-1">
                        {w.product.name}
                      </p>
                    </a>
                  ))}
                  {!c.wishlist?.length && (
                    <div className="col-span-full py-12 text-center text-muted-foreground text-sm font-light">
                      قائمة المفضلة فارغة حالياً. أضيفي قطعك المفضلة لتظهر هنا.
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'recent' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <h2 className="text-xl font-serif font-bold border-b border-border/30 pb-4">المنتجات التي شاهدتها مؤخراً</h2>
                {recentProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12 font-light">لم تقومي بمشاهدة أي منتجات مؤخراً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentProducts.map((prod: any, idx: number) => (
                      <a href={`/product/${prod.slug}`} key={idx} className="p-3 rounded-2xl bg-[var(--bg)] border border-border/60 space-y-2 block shadow-xs">
                        <Image
                          src={prod.image || '/placeholder.svg'}
                          alt={prod.name}
                          width={600}
                          height={600}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="aspect-square w-full object-cover rounded-xl"
                        />
                        <h3 className="text-sm font-medium line-clamp-1">{prod.name}</h3>
                        <span className="text-[var(--gold)] font-bold text-xs">{prod.price} ج.م</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'security' && (
              <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <h2 className="text-xl font-serif font-bold border-b border-border/30 pb-4">تغيير كلمة المرور</h2>
                <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  if (passwords.newPass !== passwords.confirmPass) {
                    setMsg('كلمتا المرور الجديدتان غير متطابقتين');
                    return;
                  }
                  const result = await changePassword(passwords);
                  if (result.ok) {
                    setPasswords({ current: '', newPass: '', confirmPass: '' });
                    setMsg('تم تحديث كلمة المرور بنجاح');
                  } else {
                    setMsg(result.error || 'تعذر تحديث كلمة المرور');
                  }
                  setTimeout(() => setMsg(''), 3500);
                }} className="space-y-4 max-w-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">كلمة المرور الحالية</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.current} 
                      onChange={e => setPasswords({ ...passwords, current: e.target.value })} 
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] shadow-xs" 
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.newPass} 
                      onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} 
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] shadow-xs" 
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.confirmPass} 
                      onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })} 
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] shadow-xs" 
                      dir="ltr"
                    />
                  </div>
                  <button type="submit" className="px-6 py-3.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-md hover:opacity-95 transition">
                    تحديث كلمة المرور
                  </button>
                  {msg && <p className="text-sm text-[var(--gold)] font-medium pt-2">{msg}</p>}
                </form>
              </div>
            )}

          </section>

        </div>

      </div>
    </main>
  );
}
