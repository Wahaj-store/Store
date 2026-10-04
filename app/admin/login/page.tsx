'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

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

      if (!res.ok) {
        throw new Error(data?.error || 'بيانات الدخول غير صحيحة أو لا يمكن الوصول إلى لوحة التحكم.');
      }

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
    <main
      dir="rtl"
      className="min-h-screen bg-[var(--bg)] text-foreground px-4 py-8 md:px-8 md:py-12 flex items-center justify-center"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/50 bg-muted/10 shadow-2xl lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden border-l border-border/40 bg-[var(--gold)]/5 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />

          <div className="relative">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] border border-[var(--gold)]/25 bg-[var(--bg)] shadow-xl">
              <Image
                src="/images/wahaj.logo.png"
                alt="Wahaj Store"
                fill
                sizes="128px"
                className="object-contain p-5"
                priority
              />
            </div>
            <div className="mt-8 text-center">
              <p className="text-[11px] font-bold tracking-[0.28em] text-[var(--gold)]">WAHAJ STORE</p>
              <h1 className="mt-3 font-serif text-3xl font-bold">لوحة تحكم وهج</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                مساحة إدارة احترافية ومنظمة لإدارة المتجر والطلبات والعملاء والعروض والمحتوى.
              </p>
            </div>
          </div>

          <div className="relative rounded-3xl border border-[var(--gold)]/20 bg-[var(--bg)]/70 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-[var(--gold)]" size={20} />
              <div>
                <p className="text-sm font-bold">دخول آمن للإدارة</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  لا تشارك بيانات الدخول مع أي شخص، وسجّل الخروج عند استخدام جهاز مشترك.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center justify-center p-6 sm:p-10 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="mx-auto relative h-24 w-24 overflow-hidden rounded-[1.5rem] border border-[var(--gold)]/25 bg-[var(--bg)] shadow-lg">
                <Image src="/images/wahaj.logo.png" alt="Wahaj Store" fill sizes="96px" className="object-contain p-3" priority />
              </div>
              <div className="mt-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.22em] text-[var(--gold)]">WAHAJ STORE</p>
                <h1 className="mt-2 font-serif text-2xl font-bold">لوحة تحكم وهج</h1>
              </div>
            </div>

            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-3 py-1.5 text-[11px] font-bold text-[var(--gold)]">
                <LockKeyhole size={13} /> دخول الإدارة
              </span>
              <h2 className="mt-4 font-serif text-2xl font-bold md:text-3xl">مرحبًا بعودتك</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">سجّل الدخول للوصول إلى لوحة التحكم.</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-email" className="text-xs font-semibold text-muted-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border/60 bg-[var(--bg)] pr-11 pl-4 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/10"
                    placeholder="admin@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-xs font-semibold text-muted-foreground">كلمة المرور</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border/60 bg-[var(--bg)] pr-11 pl-12 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/10"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--gold)]"
                />
                <span>تذكرني على هذا الجهاز</span>
              </label>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-6 text-red-500">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--gold)] px-5 text-sm font-bold text-[var(--gold-contrast)] shadow-lg shadow-[var(--gold)]/10 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeft size={18} />}
                {busy ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
              </button>
            </form>

            <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">
              Wahaj Store · إدارة المتجر بأناقة وبساطة
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
