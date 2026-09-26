// مسار الملف: app/admin/page.tsx

'use client';
import { useState, useEffect } from 'react';
import AdminManager from '@/components/AdminManager';
import { Store, LogOut, ShieldCheck, Sparkles, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Admin() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.authenticated || !data?.user) {
          router.replace('/admin/login');
          return;
        }
        if (mounted) setUser(data.user);
      })
      .catch(() => {
        router.replace('/admin/login');
      })
      .finally(() => {
        if (mounted) setAuthChecking(false);
      });

    return () => { mounted = false; };
  }, [router]);

  if (authChecking || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-foreground" dir="rtl">
        <div className="text-sm text-muted-foreground">جارٍ التحقق من جلسة الإدارة…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 px-4 md:px-8 bg-[var(--bg)] text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-start pb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-muted/10 border border-border/60 text-xs md:text-sm font-bold text-foreground hover:border-[#D4AF37] transition shadow-xs cursor-pointer"
          >
            <Menu size={18} className="text-[#D4AF37]" />
            <span>القائمة</span>
          </button>
        </div>

        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck size={14} />
                لوحة الإدارة العليا
              </span>
              <span className="text-xs text-muted-foreground font-light">
                • الصلاحية: <strong className="text-foreground">{user.role}</strong>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight flex items-center gap-2">
              <Sparkles size={22} className="text-[#D4AF37]" /> متجر وَهَج
            </h1>
            <p className="text-muted-foreground text-sm font-light">
              مرحبًا بك، <span className="text-foreground font-medium">{user.name || user.email}</span> — يمكنك إدارة عمليات المتجر حسب صلاحيات حسابك.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs md:text-sm font-medium bg-muted/10 border border-border/60 text-foreground hover:border-[#D4AF37] transition shadow-xs"
            >
              <Store size={16} className="text-[#D4AF37]" />
              <span>استعراض المتجر</span>
            </a>

            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs md:text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition shadow-xs cursor-pointer"
              >
                <LogOut size={16} />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </header>

        <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm">
          <AdminManager sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>
      </div>
    </main>
  );
}
