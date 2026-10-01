"use client";

import { Sparkles, Phone, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function AccountAuthView(props: any) {
  const {
    mode, setMode, form, setForm, msg, setMsg, isForgotMode, setIsForgotMode,
    forgotStep, setForgotStep, resetData, setResetData, loading, showPassword,
    setShowPassword, showResetPassword, setShowResetPassword, rememberMe, setRememberMe,
    auth, handleSendOtp, handleResetPassword,
  } = props;

  return (
      <main className="min-h-[calc(100vh-72px)] py-10 md:py-16 px-4 md:px-8 bg-[var(--bg)] text-foreground transition-colors duration-300 flex items-center justify-center relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-50" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-[var(--gold)]/5 blur-3xl" />
        </div>
        <div className="container max-w-5xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-12 items-center relative z-10">
          
          <div className="hidden lg:flex min-h-[520px] rounded-[2rem] border border-[var(--gold)]/20 bg-gradient-to-br from-[var(--gold)]/10 via-transparent to-transparent p-10 items-end relative overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.08)] dark:shadow-black/20">
            <div className="absolute top-10 right-10 w-28 h-28 rounded-full border border-[var(--gold)]/25" />
            <div className="absolute top-16 right-16 w-16 h-16 rounded-full border border-[var(--gold)]/20" />
            <div className="space-y-6 max-w-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] text-xs font-semibold">
                <Sparkles size={14} /> تجربة وَهَج
              </span>
              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight leading-tight">أناقة تبدأ من<br /><span className="text-[var(--gold)]">تفاصيلك.</span></h2>
                <p className="text-sm leading-7 text-muted-foreground">ادخلي إلى حسابك لمتابعة طلباتك، إدارة عناوينك والوصول إلى مفضلاتك في تجربة تسوق مصممة بروح وَهَج.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {['طلباتك', 'مفضلاتك', 'عناوينك'].map((item) => (
                  <div key={item} className="rounded-2xl border border-border/50 bg-background/40 backdrop-blur-sm p-3 text-center">
                    <span className="block text-xs font-medium text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-xs">
              <Sparkles size={30} />
            </div>
            <a href="/" className="inline-block text-3xl font-serif font-bold tracking-wider text-[var(--gold)]">
              وَهَج
            </a>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
              {isForgotMode ? 'استعادة كلمة المرور' : (mode === 'login' ? 'أهلاً بكِ مجدداً' : 'انضمي إلى عائلة وَهَج')}
            </h1>
            <p className="text-muted-foreground text-sm font-light">
              {isForgotMode 
                ? 'أدخلي بريدك الإلكتروني المسجل لاستلام رمز التحقق.' 
                : (mode === 'login' ? 'سجلي دخولك لمتابعة طلبياتك وإدارتها بكل سهولة.' : 'أنشئي حسابك الجديد واستمتعي بتجربة تسوق فريدة.')}
            </p>
          </div>

          {!isForgotMode && (
            <div className="flex p-1.5 rounded-2xl bg-muted/10 border border-border/40 shadow-xs">
              <button
                type="button"
                onClick={() => { setMode('login'); setMsg(''); setShowPassword(false); }}
                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${
                  mode === 'login' ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setMsg(''); setShowPassword(false); setRememberMe(false); }}
                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${
                  mode === 'register' ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                إنشاء حساب
              </button>
            </div>
          )}

          <div className="bg-muted/10 border border-border/50 rounded-[2rem] p-6 md:p-9 shadow-[0_20px_70px_rgba(0,0,0,0.08)] dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--gold)]/5 rounded-bl-full pointer-events-none" />

            {isForgotMode ? (
              <div className="space-y-4">
                {forgotStep === 'email' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-foreground">البريد الإلكتروني المسجل</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                        placeholder="name@example.com"
                        dir="ltr"
                        value={resetData.email}
                        onChange={e => setResetData({ ...resetData, email: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
                    >
                      <span>{loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}</span>
                      <ArrowLeft size={18} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-foreground">رمز التحقق (6 أرقام)</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm tracking-widest text-center font-bold focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                        placeholder="123456"
                        dir="ltr"
                        value={resetData.otp}
                        onChange={e => setResetData({ ...resetData, otp: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-foreground">كلمة المرور الجديدة</label>
                      <div className="relative">
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className="w-full px-4 pl-12 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                          placeholder="••••••••"
                          dir="ltr"
                          value={resetData.newPassword}
                          onChange={e => setResetData({ ...resetData, newPassword: e.target.value })}
                        />
                        <button type="button" onClick={() => setShowResetPassword((v: boolean) => !v)} aria-label={showResetPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-muted-foreground hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 transition">
                          {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
                    >
                      <span>{loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
                      <CheckCircle2 size={18} />
                    </button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-[var(--gold)] transition font-medium"
                    onClick={() => { setIsForgotMode(false); setForgotStep('email'); setMsg(''); }}
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium text-foreground">الاسم الكامل</label>
                    <div className="relative">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><User size={18} /></span>
                      <input
                        className="w-full pr-11 pl-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                        placeholder="أدخلي اسمكِ"
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-medium text-foreground">
                    {mode === 'login' ? 'رقم الهاتف أو البريد الإلكتروني' : 'رقم الهاتف'}
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone size={18} /></span>
                    <input
                      className="w-full pr-11 pl-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      placeholder={mode === 'login' ? 'رقم الهاتف أو الإيميل' : '01xxxxxxxxx'}
                      dir="ltr"
                      onChange={e => setForm({ ...form, phone: e.target.value, email: e.target.value })}
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium text-foreground">البريد الإلكتروني</label>
                    <input
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      placeholder="name@example.com"
                      dir="ltr"
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs md:text-sm font-medium text-foreground">كلمة المرور</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotMode(true); setMsg(''); }}
                        className="text-xs text-[var(--gold)] hover:underline font-medium"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock size={18} /></span>
                    <input
                      className="w-full pr-11 pl-12 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      dir="ltr"
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                    <button type="button" onClick={() => setShowPassword((v: boolean) => !v)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-muted-foreground hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 transition">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs md:text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className="w-5 h-5 rounded-md border border-border/70 bg-[var(--bg)] flex items-center justify-center transition peer-checked:bg-[var(--gold)] peer-checked:border-[var(--gold)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--gold)]/40 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                        <CheckCircle2 size={13} className="text-[var(--gold-contrast)] opacity-0 peer-checked:opacity-100" />
                      </span>
                      <span>تذكرني على هذا الجهاز</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground/70">جلسة آمنة</span>
                  </div>
                )}

                <button
                  className="w-full mt-2 py-3.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm md:text-base shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
                  onClick={auth}
                >
                  <span>{mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</span>
                  <ArrowLeft size={18} />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    className="text-xs md:text-sm text-[var(--gold)] hover:underline font-medium"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  >
                    {mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
                  </button>
                </div>
              </>
            )}

            {msg && (
              <div className={`p-3 rounded-xl text-center text-xs md:text-sm ${
                msg.includes('نجاح') || msg.includes('تم إرسال') ? 'bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)]' : 'bg-red-500/10 border border-red-500/20 text-red-500'
              }`}>
                {msg}
              </div>
            )}

          </div>

        </div>
      </main>

  );
}
