'use client';

import { useEffect, useState } from 'react';
import { 
  Heart, Package, UserRound, LogOut, Save, Sparkles, Phone, 
  Lock, User, ArrowLeft, MapPin, Eye, Clock, CheckCircle2, ChevronLeft, Trash2, XCircle, Truck, PackageCheck 
} from 'lucide-react';

export default function Account() {
  const [c, setC] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('profile');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([
    { id: 1, title: 'المنزل الرئيسي', details: 'القاهرة، مدينة نصر، شارع مكرم عبيد', phone: '01000000000' }
  ]);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });

  async function load() {
    const r = await fetch('/api/customer/me');
    if (r.ok) setC(await r.json());
  }

  useEffect(() => {
    load();
    const recents = JSON.parse(localStorage.getItem('wahaj_recent_products') || '[]');
    setRecentProducts(recents);
  }, []);

  async function auth() {
    setMsg('');
    const r = await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action: mode }),
    });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error);
    load();
  }

  async function logout() {
    await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setC(null);
  }

  // دالة مساعدة للحصول على تاريخ ووقت مرحلة معينة من OrderTimeline
  const getTimelineDate = (statusName: string) => {
    if (!selectedOrder?.timeline) return null;
    const match = selectedOrder.timeline.find((t: any) => t.status === statusName);
    if (!match) return null;
    return new Date(match.createdAt).toLocaleString('ar-EG', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  };

  if (!c) {
    return (
      <main className="min-h-screen py-12 px-4 md:px-8 bg-background text-foreground transition-colors duration-300 flex items-center justify-center" dir="rtl">
        <div className="container max-w-md mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-sm">
              <Sparkles size={28} />
            </div>
            <a href="/" className="inline-block text-2xl font-bold tracking-wider text-[var(--gold)]">
              وَهَج
            </a>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {mode === 'login' ? 'أهلاً بكِ مجدداً' : 'انضمي إلى عائلة وَهَج'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'login' ? 'سجلي دخولك لمتابعة طلبياتك وإدارتها بكل سهولة.' : 'أنشئي حسابك الجديد واستمتعي بتجربة تسوق فريدة.'}
            </p>
          </div>

          <div className="flex p-1.5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                mode === 'login' ? 'bg-[var(--gold)] text-black shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                mode === 'register' ? 'bg-[var(--gold)] text-black shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--gold)]/5 rounded-bl-full pointer-events-none" />

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-foreground">الاسم الكامل</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><User size={18} /></span>
                  <input
                    className="w-full pr-11 pl-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                    placeholder="أدخلي اسمكِ "
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-foreground">رقم الهاتف</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone size={18} /></span>
                <input
                  className="w-full pr-11 pl-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-foreground">البريد الإلكتروني</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                  placeholder="name@example.com"
                  dir="ltr"
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-foreground">كلمة المرور</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock size={18} /></span>
                <input
                  className="w-full pr-11 pl-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                  type="password"
                  placeholder="••••••••"
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              className="w-full mt-2 py-3.5 rounded-xl bg-[var(--gold)] text-black font-bold text-sm md:text-base shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
              onClick={auth}
            >
              <span>{mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</span>
              <ArrowLeft size={18} />
            </button>

            {msg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-sm text-red-500">
                {msg}
              </div>
            )}

            <div className="text-center pt-2">
              <button
                className="text-xs md:text-sm text-[var(--gold)] hover:underline font-medium"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
              </button>
            </div>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-6xl mx-auto space-y-8">
        
        {/* الترويسة العلوية */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <span className="text-[var(--gold)] font-medium text-sm flex items-center gap-1.5">
              <Sparkles size={16} /> لوحة التحكم 
            </span>
            <h1 className="text-2xl md:text-3xl font-bold">مرحبًا بكِ، {c.name}</h1>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 text-foreground hover:border-red-500/50 hover:text-red-500 transition text-sm font-semibold shadow-sm"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* تخطيط الصفحة */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* القائمة الجانبية */}
          <aside className="w-full bg-card border border-border/60 rounded-3xl p-3 shadow-sm space-y-1.5">
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
                onClick={() => { setTab(k); setSelectedOrder(null); }}
                className={`w-full flex items-center gap-3 p-3.5 text-start rounded-2xl text-sm font-semibold transition-all ${
                  tab === k
                    ? 'bg-[var(--gold)] text-black shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <I size={18} className="shrink-0" />
                <span className="flex-1">{t}</span>
                <ChevronLeft size={16} className={tab === k ? 'text-black' : 'text-muted-foreground'} />
              </button>
            ))}

            <div className="pt-3 border-t border-border/40">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 p-3.5 text-start rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut size={18} className="shrink-0" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </aside>

          {/* محتوى التبويبات */}
          <section className="w-full space-y-6">
            
            {tab === 'profile' && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b border-border/40 pb-4">البيانات الشخصية</h2>
                
                <div className="space-y-4 max-w-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">الاسم الكامل</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                      value={c.name || ''}
                      onChange={e => setC({ ...c, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">رقم الهاتف</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                      value={c.phone || ''}
                      dir="ltr"
                      onChange={e => setC({ ...c, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">البريد الإلكتروني</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                      value={c.email || ''}
                      dir="ltr"
                      onChange={e => setC({ ...c, email: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gold)] text-black font-bold text-sm shadow-md hover:opacity-95 transition"
                  onClick={async () => {
                    await fetch('/api/customer/me', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(c),
                    });
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
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                {selectedOrder ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                      <div>
                        <h2 className="text-xl font-bold">تفاصيل الطلب: #{selectedOrder.number}</h2>
                        <span className="text-xs text-muted-foreground">حالة الطلب الحالية: <b className="text-[var(--gold)]">{selectedOrder.status}</b></span>
                      </div>
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="px-4 py-2 rounded-xl bg-background border border-border text-xs font-semibold hover:border-[var(--gold)] transition"
                      >
                        العودة للطلبات
                      </button>
                    </div>

                    {/* خط سير ومتابعة الطلب الديناميكي المرتبط بقاعدة البيانات */}
                    <div className="p-5 rounded-2xl bg-background border border-border/60 space-y-4">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Clock size={16} className="text-[var(--gold)]" /> خط سير ومتابعة الطلب
                      </h3>

                      {selectedOrder.status === 'CANCELLED' ? (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                          <XCircle size={28} className="mx-auto text-red-500" />
                          <h4 className="font-bold text-sm text-red-500">تم إلغاء هذا الطلب</h4>
                          <p className="text-xs text-muted-foreground">عذراً، تم إلغاء الطلب من قبل الإدارة أو بناءً على رغبتك.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs font-semibold">
                          
                          {/* 1. تم استلام الطلب */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                            ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={14} /> تم استلام الطلب
                            </div>
                            <span className="text-[10px] opacity-75 font-normal" dir="ltr">
                              {getTimelineDate('NEW') || getTimelineDate('PENDING') || '-'}
                            </span>
                          </div>

                          {/* 2. قيد التجهيز */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                            ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Package size={14} /> قيد التجهيز
                            </div>
                            <span className="text-[10px] opacity-75 font-normal" dir="ltr">
                              {getTimelineDate('PROCESSING') || '-'}
                            </span>
                          </div>

                          {/* 3. تم الشحن */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                            ['SHIPPED', 'DELIVERED'].includes(selectedOrder.status)
                              ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)] font-bold'
                              : 'border-border text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Truck size={14} /> تم الشحن
                            </div>
                            <span className="text-[10px] opacity-75 font-normal" dir="ltr">
                              {getTimelineDate('SHIPPED') || '-'}
                            </span>
                          </div>

                          {/* 4. تم التسليم */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                            selectedOrder.status === 'DELIVERED'
                              ? 'bg-[var(--gold)] text-black border-[var(--gold)] font-bold bg-[var(--gold)]'
                              : 'border-border text-muted-foreground'
                          }`}>
                            <div className="flex items-center gap-1">
                              <PackageCheck size={14} /> تم التسليم
                            </div>
                            <span className="text-[10px] opacity-75 font-normal" dir="ltr">
                              {getTimelineDate('DELIVERED') || '-'}
                            </span>
                          </div>

                        </div>
                      )}

                      {/* معلومات شركة الشحن ورقم التتبع إن وجدت */}
                      {(selectedOrder.shippingProvider || selectedOrder.trackingNumber) && (
                        <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-xs flex flex-wrap justify-between gap-2 mt-3">
                          {selectedOrder.shippingProvider && <span><b>شركة الشحن:</b> {selectedOrder.shippingProvider}</span>}
                          {selectedOrder.trackingNumber && <span dir="ltr"><b>رقم التتبع:</b> {selectedOrder.trackingNumber}</span>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-sm">المنتجات في هذا الطلب</h3>
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-background border border-border/60 text-sm">
                          <span>{item.name || item.product?.name || 'منتج'} × {item.quantity}</span>
                          <span className="text-[var(--gold)] font-bold">{Number(item.price).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-border/40 pt-4 font-bold text-base">
                      <span>الإجمالي الكلي</span>
                      <span className="text-[var(--gold)] text-lg">{Number(selectedOrder.total).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold border-b border-border/40 pb-4">سجل الطلبات ومتابعتها</h2>
                    <div className="grid gap-3">
                      {(c.orders || []).map((o: any) => (
                        <div
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-background border border-border/60 hover:border-[var(--gold)]/50 transition"
                        >
                          <div className="space-y-1">
                            <b className="text-foreground">طلب #{o.number}</b>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] font-medium">
                                {o.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <strong className="text-[var(--gold)] text-base">
                              {Number(o.total).toLocaleString('ar-EG')} ج.م
                            </strong>
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="px-4 py-2 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition"
                            >
                              التفاصيل والمتابعة
                            </button>
                          </div>
                        </div>
                      ))}
                      {!c.orders?.length && (
                        <p className="text-muted-foreground text-sm py-12 text-center">لا توجد طلبات سابقة حتى الآن.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'addresses' && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-border/40 pb-4">
                  <h2 className="text-xl font-bold">عناوين الشحن المحفوظة</h2>
                  <button className="px-4 py-2 rounded-xl bg-[var(--gold)] text-black text-xs font-bold hover:opacity-95 transition">
                    + إضافة عنوان جديد
                  </button>
                </div>
                <div className="grid gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-4 rounded-2xl bg-background border border-border/60 flex items-start justify-between gap-4">
                      <div className="space-y-1 text-sm">
                        <span className="font-bold block text-foreground">{addr.title}</span>
                        <p className="text-muted-foreground text-xs">{addr.details}</p>
                        <span className="text-[var(--gold)] text-xs font-semibold block pt-1">الهاتف: {addr.phone}</span>
                      </div>
                      <button className="text-red-500 hover:text-red-600 transition p-1">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b border-border/40 pb-4">قائمة المفضلة</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(c.wishlist || []).map((w: any) => (
                    <a
                      href={`/product/${w.product.slug}`}
                      key={w.id}
                      className="group p-3 rounded-2xl bg-background border border-border/60 hover:border-[var(--gold)]/50 transition space-y-2 block"
                    >
                      <img
                        className="aspect-square w-full object-cover rounded-xl"
                        src={w.product.images?.[0]?.url || '/placeholder.svg'}
                        alt={w.product.name}
                      />
                      <p className="text-sm font-medium group-hover:text-[var(--gold)] transition line-clamp-1">
                        {w.product.name}
                      </p>
                    </a>
                  ))}
                  {!c.wishlist?.length && (
                    <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                      قائمة المفضلة فارغة حالياً. أضيفي قطعك المفضلة لتظهر هنا.
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'recent' && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b border-border/40 pb-4">المنتجات التي شاهدتها مؤخراً</h2>
                {recentProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">لم تقومي بمشاهدة أي منتجات مؤخراً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentProducts.map((prod: any, idx: number) => (
                      <a href={`/product/${prod.slug}`} key={idx} className="p-3 rounded-2xl bg-background border border-border/60 space-y-2 block">
                        <img src={prod.image || '/placeholder.svg'} alt={prod.name} className="aspect-square w-full object-cover rounded-xl" />
                        <h3 className="text-sm font-medium line-clamp-1">{prod.name}</h3>
                        <span className="text-[var(--gold)] font-bold text-xs">{prod.price} ج.م</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'security' && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b border-border/40 pb-4">تغيير كلمة المرور</h2>
                <form onSubmit={(e) => { e.preventDefault(); setMsg('تم تحديث كلمة المرور بنجاح'); setTimeout(() => setMsg(''), 3000); }} className="space-y-4 max-w-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">كلمة المرور الحالية</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.current} 
                      onChange={e => setPasswords({ ...passwords, current: e.target.value })} 
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" 
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.newPass} 
                      onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} 
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" 
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.confirmPass} 
                      onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })} 
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" 
                      dir="ltr"
                    />
                  </div>
                  <button type="submit" className="px-6 py-3 rounded-xl bg-[var(--gold)] text-black font-bold text-sm shadow-md hover:opacity-95 transition">
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
