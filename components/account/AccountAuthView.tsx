"use client";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Sparkles, User } from 'lucide-react';

export default function AccountAuthView(props: any) {
  const { mode, setMode, form, setForm, msg, setMsg, isForgotMode, setIsForgotMode, forgotStep, setForgotStep, resetData, setResetData, loading, showPassword, setShowPassword, showResetPassword, setShowResetPassword, rememberMe, setRememberMe, auth, handleSendOtp, handleResetPassword } = props;
  const isSuccess = msg && (msg.includes('نجاح') || msg.includes('تم إرسال'));
  return (
    <main className="wahaj-account-auth" dir="rtl">
      <div className="wahaj-account-auth__glow wahaj-account-auth__glow--one" /><div className="wahaj-account-auth__glow wahaj-account-auth__glow--two" />
      <div className="wahaj-account-auth__shell">
        <section className="wahaj-account-auth__brand-panel">
          <a href="/" className="wahaj-account-auth__brand"><span className="wahaj-account-auth__brand-mark"><Sparkles size={19} /></span><span><b>وَهَج</b><small>Wahaj Store</small></span></a>
          <div className="wahaj-account-auth__brand-copy"><span className="wahaj-account-auth__eyebrow"><i /> مساحة عضويتك الخاصة</span><h1>تجربة تسوّق<br /><strong>تليق بتفاصيلك.</strong></h1><p>تابعي طلباتك، احفظي عناوينك، واحتفظي بمفضلاتك في مكان واحد مصمم بروح وَهَج.</p></div>
          <div className="wahaj-account-auth__benefits"><Benefit symbol="✦" title="متابعة الطلبات" text="كل تحديثات شحنتك" /><Benefit symbol="♡" title="قائمة المفضلة" text="منتجاتك الأقرب إليك" /><Benefit symbol="✓" title="حساب آمن" text="خصوصية وراحة بال" /></div><div className="wahaj-account-auth__ornament">وَ</div>
        </section>
        <section className="wahaj-account-auth__form-panel"><a href="/" className="wahaj-account-auth__back"><ArrowLeft size={14} /> العودة للمتجر</a><div className="wahaj-account-auth__form-wrap">
          <div className="wahaj-account-auth__mobile-brand"><span className="wahaj-account-auth__brand-mark"><Sparkles size={17} /></span><span><b>وَهَج</b><small>Wahaj Store</small></span></div>
          <div className="wahaj-account-auth__heading"><span className="wahaj-account-auth__section-label">حساب العضوية</span><h2>{isForgotMode ? 'استعادة كلمة المرور' : mode === 'login' ? 'مرحبًا بكِ مجددًا' : 'انضمي إلى عائلة وَهَج'}</h2><p>{isForgotMode ? 'أدخلي بريدك الإلكتروني لاستلام رمز التحقق.' : mode === 'login' ? 'سجّلي دخولك لمتابعة طلباتك وإدارتها بسهولة.' : 'أنشئي حسابك الجديد واستمتعي بتجربة أكثر سلاسة.'}</p></div>
          {!isForgotMode && <div className="wahaj-account-auth__tabs" role="tablist"><button type="button" onClick={() => { setMode('login'); setMsg(''); setShowPassword(false); }} className={mode === 'login' ? 'is-active' : ''}>تسجيل الدخول</button><button type="button" onClick={() => { setMode('register'); setMsg(''); setShowPassword(false); setRememberMe(false); }} className={mode === 'register' ? 'is-active' : ''}>إنشاء حساب</button></div>}
          {!isForgotMode && mode === 'login' && <SocialLogin />}
          <div className="wahaj-account-auth__card">
            {isForgotMode ? (forgotStep === 'email' ? <form onSubmit={handleSendOtp} className="wahaj-account-form"><Field label="البريد الإلكتروني المسجل" icon={<Mail size={17} />}><input type="email" required className="wahaj-account-input" placeholder="name@example.com" dir="ltr" value={resetData.email} onChange={e => setResetData({ ...resetData, email: e.target.value })} /></Field><Submit text={loading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'} icon={<ArrowLeft size={17} />} disabled={loading} /></form> : <form onSubmit={handleResetPassword} className="wahaj-account-form"><Field label="رمز التحقق (6 أرقام)" icon={<ShieldCheck size={17} />}><input type="text" required maxLength={6} className="wahaj-account-input wahaj-account-input--code" placeholder="123456" dir="ltr" value={resetData.otp} onChange={e => setResetData({ ...resetData, otp: e.target.value })} /></Field><Field label="كلمة المرور الجديدة" icon={<Lock size={17} />}><PasswordInput value={resetData.newPassword} show={showResetPassword} onChange={(value: string) => setResetData({ ...resetData, newPassword: value })} onToggle={() => setShowResetPassword((v: boolean) => !v)} /></Field><Submit text={loading ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'} icon={<CheckCircle2 size={17} />} disabled={loading} /></form>) : <form className="wahaj-account-form" onSubmit={(e) => { e.preventDefault(); auth(); }}>
              {mode === 'register' && <Field label="الاسم الكامل" icon={<User size={17} />}><input required className="wahaj-account-input" placeholder="أدخلي اسمكِ" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>}
              <Field label={mode === 'login' ? 'رقم الهاتف أو البريد الإلكتروني' : 'رقم الهاتف'} icon={<Phone size={17} />}><input required className="wahaj-account-input" placeholder={mode === 'login' ? 'رقم الهاتف أو الإيميل' : '01xxxxxxxxx'} dir="ltr" value={mode === 'login' ? (form.phone || form.email || '') : (form.phone || '')} onChange={e => setForm({ ...form, phone: e.target.value, ...(mode === 'login' ? { email: e.target.value } : {}) })} /></Field>
              {mode === 'register' && <Field label="البريد الإلكتروني (اختياري)" icon={<Mail size={17} />}><input type="email" className="wahaj-account-input" placeholder="name@example.com" dir="ltr" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>}
              <div className="wahaj-account-field"><div className="wahaj-account-label-row"><label>كلمة المرور</label>{mode === 'login' && <button type="button" onClick={() => { setIsForgotMode(true); setMsg(''); }}>نسيت كلمة المرور؟</button>}</div><PasswordInput value={form.password || ''} show={showPassword} onChange={(value: string) => setForm({ ...form, password: value })} onToggle={() => setShowPassword((v: boolean) => !v)} /></div>
              {mode === 'login' && <label className="wahaj-account-remember"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /><span><CheckCircle2 size={12} /></span> تذكريني على هذا الجهاز <small><ShieldCheck size={12} /> جلسة آمنة</small></label>}
              <Submit text={mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'} icon={<ArrowLeft size={17} />} />
            </form>}
            {msg && <div className={`wahaj-account-message ${isSuccess ? 'is-success' : 'is-error'}`}>{msg}</div>}
            <div className="wahaj-account-switch">{isForgotMode ? <button type="button" onClick={() => { setIsForgotMode(false); setForgotStep('email'); setMsg(''); }}>العودة لتسجيل الدخول</button> : <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}</button>}</div>
          </div><p className="wahaj-account-auth__note"><ShieldCheck size={14} /> بياناتك محمية ونستخدمها فقط لتحسين تجربتك في وَهَج</p>
        </div></section>
      </div>
    </main>
  );
}
function SocialLogin() {
  return <div className="wahaj-account-social" aria-label="تسجيل الدخول عبر وسائل التواصل الاجتماعي">
    <div className="wahaj-account-social__divider"><span>أو تابعي باستخدام</span></div>
    <div className="wahaj-account-social__buttons">
      <a href="/api/customer/social/google" className="wahaj-account-social__button" aria-label="تسجيل الدخول باستخدام Google"><span className="wahaj-account-social__logo wahaj-account-social__logo--google">G</span><span>Google</span></a>
      <a href="/api/customer/social/facebook" className="wahaj-account-social__button" aria-label="تسجيل الدخول باستخدام Facebook"><span className="wahaj-account-social__logo wahaj-account-social__logo--facebook">f</span><span>Facebook</span></a>
    </div>
  </div>;
}
function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) { return <div className="wahaj-account-field"><label className="wahaj-account-label"><span>{icon}</span>{label}</label>{children}</div>; }
function PasswordInput({ value, show, onChange, onToggle }: any) { return <div className="wahaj-account-password"><Lock size={17} /><input required type={show ? 'text' : 'password'} autoComplete="current-password" className="wahaj-account-input" placeholder="••••••••" dir="ltr" value={value} onChange={e => onChange(e.target.value)} /><button type="button" onClick={onToggle} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>; }
function Submit({ text, icon, disabled }: any) { return <button type="submit" disabled={disabled} className="wahaj-account-submit"><span>{text}</span>{icon}</button>; }
function Benefit({ symbol, title, text }: { symbol: string; title: string; text: string }) { return <div><span className="wahaj-mini-icon">{symbol}</span><b>{title}</b><small>{text}</small></div>; }
