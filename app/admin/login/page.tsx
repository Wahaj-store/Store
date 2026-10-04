'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'wahaj_admin_remembered_email';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // localStorage can be unavailable in hardened browser modes.
    }
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'بيانات الدخول غير صحيحة أو لا يمكن الوصول إلى لوحة التحكم.');

      try {
        if (rememberMe) window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // Remembering the email is optional and must never block login.
      }
      router.replace('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wahaj-login" dir="rtl">
      <div className="wahaj-login__frame">
        <section className="wahaj-login__brand-panel" aria-label="هوية متجر وهج">
          <div className="wahaj-login__brand-top">
            <Link className="wahaj-login__brand" href="/" aria-label="العودة إلى متجر وهج">
              <span className="wahaj-login__logo"><Image src="/images/wahaj.logo.png" alt="" fill sizes="48px" priority /></span>
              <span><b>وَهَج</b><small>متجر التفاصيل الراقية</small></span>
            </Link>
            <span className="wahaj-login__secure"><ShieldCheck size={14} /> دخول آمن</span>
          </div>

          <div className="wahaj-login__brand-copy">
            <span className="wahaj-login__eyebrow"><Sparkles size={14} /> مساحة إدارة المتجر</span>
            <h1>كل تفاصيل متجرك،<br /><em>في مكان واحد.</em></h1>
            <p>من الطلبات والمنتجات إلى العملاء والمحتوى — تجربة إدارة واضحة تساعدك على التركيز فيما يصنع الفرق.</p>
          </div>

          <div className="wahaj-login__brand-bottom">
            <div className="wahaj-login__brand-mark" aria-hidden="true"><span>و</span><i /><i /><i /></div>
            <div><b>إدارة بثقة وهدوء</b><small>بياناتك محمية، وصلاحياتك دائمًا تحت سيطرتك.</small></div>
          </div>
        </section>

        <section className="wahaj-login__form-panel">
          <Link className="wahaj-login__back" href="/"><ArrowUpLeft size={16} /> العودة للمتجر</Link>
          <div className="wahaj-login__form-wrap">
            <div className="wahaj-login__mobile-brand">
              <span className="wahaj-login__logo"><Image src="/images/wahaj.logo.png" alt="" fill sizes="48px" priority /></span>
              <span><b>وَهَج</b><small>لوحة الإدارة</small></span>
            </div>
            <div className="wahaj-login__heading">
              <span className="wahaj-login__kicker">مرحبًا بعودتك</span>
              <h2>سجّل الدخول</h2>
              <p>أدخل بيانات حساب الإدارة للمتابعة إلى مساحة عملك.</p>
            </div>

            <form onSubmit={submit} className="wahaj-login__form">
              <div className="wahaj-login__field">
                <label htmlFor="admin-email">البريد الإلكتروني</label>
                <div className="wahaj-login__input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" dir="ltr" />
                </div>
              </div>
              <div className="wahaj-login__field">
                <label htmlFor="admin-password">كلمة المرور</label>
                <div className="wahaj-login__input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input id="admin-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" dir="ltr" />
                  <button type="button" className="wahaj-login__show-password" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <label className="wahaj-login__remember">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="wahaj-login__check" aria-hidden="true" />
                <span>تذكرني على هذا الجهاز</span>
              </label>

              {error && <div className="wahaj-login__error" role="alert"><ShieldCheck size={16} /> <span>{error}</span></div>}

              <button type="submit" disabled={busy} className="wahaj-login__submit">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} />}
                <span>{busy ? 'جارٍ تسجيل الدخول…' : 'الدخول إلى لوحة التحكم'}</span>
              </button>
            </form>

            <div className="wahaj-login__privacy"><ShieldCheck size={15} /><span>لا تشارك بيانات الدخول، وسجّل الخروج بعد استخدام جهاز مشترك.</span></div>
          </div>
          <footer className="wahaj-login__footer"><span>وَهَج</span><span>مساحة الإدارة · 2026</span></footer>
        </section>
      </div>
    </main>
  );
}
