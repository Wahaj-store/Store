'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'حدث خطأ أثناء تسجيل الدخول');
      }
    } catch {
      setError('تعذر الاتصال بالخادم، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        
        {/* الترويسة والشعار */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] mb-2 shadow-sm border border-[var(--gold)]/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة تحكم وَهَج</h1>
          <p className="text-xs muted">قم بتسجيل الدخول لإدارة المتجر والطلبات والإعدادات</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <div className="lux-card p-8 bg-background border hairline rounded-2xl shadow-xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* حقل البريد الإلكتروني */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground/80">البريد الإلكتروني</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none muted">
                  <Mail size={18} />
                </span>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wahaj.com" 
                  className="input w-full pr-10 pl-3 py-2.5 text-sm rounded-xl border hairline bg-background focus:border-[var(--gold)] transition"
                  dir="ltr"
                />
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground/80">كلمة المرور</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none muted">
                  <Lock size={18} />
                </span>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="input w-full pr-10 pl-3 py-2.5 text-sm rounded-xl border hairline bg-background focus:border-[var(--gold)] transition"
                  dir="ltr"
                />
              </div>
            </div>

            {/* رسالة الخطأ */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium animate-shake">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* زر الدخول */}
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-gold w-full py-3 rounded-xl font-medium text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>جاري التحقق وتسجيل الدخول...</span>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight size={16} className="rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* رابط العودة للمتجر */}
        <div className="text-center">
          <a 
            href="/" 
            className="text-xs muted hover:text-[var(--gold)] transition inline-flex items-center gap-1.5 font-medium"
          >
            ← العودة إلى واجهة متجر وَهَج
          </a>
        </div>

      </div>
    </main>
  );
}
