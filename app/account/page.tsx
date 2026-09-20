'use client';

import { useEffect, useState } from 'react';
import { Heart, Package, UserRound, LogOut, Save, Sparkles, Phone, Lock, User, ArrowLeft } from 'lucide-react';

export default function Account() {
  const [c, setC] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('profile');

  async function load() {
    const r = await fetch('/api/customer/me');
    if (r.ok) setC(await r.json());
  }

  useEffect(() => {
    load();
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

  // شاشة تسجيل الدخول وإنشاء الحساب بالتصميم الاحترافي الجديد
  if (!c) {
    return (
      <main className="min-h-screen py-12 px-4 md:px-8 bg-background text-foreground transition-colors duration-300 flex items-center justify-center" dir="rtl">
        <div className="container max-w-md mx-auto space-y-8">
          
          {/* الشعار والترويسة */}
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

          {/* أزرار التبديل (Tabs) */}
          <div className="flex p-1.5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-[var(--gold)] text-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setMsg(''); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-[var(--gold)] text-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          {/* صندوق النموذج */}
          <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--gold)]/5 rounded-bl-full pointer-events-none" />

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-foreground">الاسم الكامل</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User size={18} />
                  </span>
                  <input
                    className="w-full pr-11 pl-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                    placeholder="أدخلي اسمكِ الكريم"
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-foreground">رقم الهاتف</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone size={18} />
                </span>
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock size={18} />
                </span>
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

  // لوحة التحكم الخاصة بالحساب (الملف الشخصي، الطلبات، المفضلة)
  return (
    <main className="min-h-screen py-10 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-6xl mx-auto space-y-8">
        
        {/* الترويسة العلوية */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <span className="text-[var(--gold)] font-medium text-sm">حسابي الشخصي</span>
            <h1 className="text-2xl md:text-3xl font-bold">مرحبًا، {c.name}</h1>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 text-foreground hover:border-red-500/50 hover:text-red-500 transition text-sm font-semibold shadow-sm"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* محتوى الحساب والتبويبات */}
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          
          {/* القائمة الجانبية للتبويبات */}
          <aside className="bg-card border border-border/60 rounded-3xl p-3 shadow-sm h-fit space-y-1.5">
            {[
              ['profile', 'الملف الشخصي', UserRound],
              ['orders', 'طلباتي', Package],
              ['wishlist', 'المفضلة', Heart],
            ].map(([k, t, I]: any) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`w-full flex items-center gap-3 p-3.5 text-start rounded-2xl text-sm font-semibold transition-all ${
                  tab === k
                    ? 'bg-[var(--gold)] text-black shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <I size={18} className="shrink-0" />
                <span>{t}</span>
              </button>
            ))}
          </aside>

          {/* محتوى التبويب النشط */}
          <section className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm">
            {tab === 'profile' && (
              <div className="space-y-6 max-w-xl">
                <h2 className="text-xl font-bold">تعديل البيانات الشخصية</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">الاسم</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition"
                      value={c.name || ''}
                      onChange={e => setC({ ...c, name: e.target.value })}
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
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">سجل الطلبات</h2>
                <div className="grid gap-3">
                  {(c.orders || []).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-background border border-border/60"
                    >
                      <div>
                        <b className="text-foreground">طلب #{o.number}</b>
                        <span className="mx-3 text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] font-medium">
                          {o.status}
                        </span>
                      </div>
                      <strong className="text-[var(--gold)] text-base">
                        {Number(o.total).toLocaleString('ar-EG')} ج.م
                      </strong>
                    </div>
                  ))}
                  {!c.orders?.length && (
                    <p className="text-muted-foreground text-sm py-8 text-center">لا توجد طلبات سابقة حتى الآن.</p>
                  )}
                </div>
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">قائمة المفضلة</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
          </section>

        </div>

      </div>
    </main>
  );
}
