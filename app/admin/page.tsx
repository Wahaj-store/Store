import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminManager from '@/components/AdminManager';
import { Store, LogOut, ShieldCheck } from 'lucide-react';

export default async function Admin() {
  const u = await getUser();
  
  if (!u || !u.active) {
    redirect('/admin/login');
  }

  return (
    <main className="min-h-screen py-8 bg-background text-foreground" dir="rtl">
      <div className="container max-w-7xl mx-auto px-4">
        
        {/* ترويسة لوحة التحكم الفاخرة */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b hairline pb-6 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                لوحة الإدارة العليا
              </span>
              <span className="text-xs muted">• الصلاحية: {u.role}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">متجر وَهَج</h1>
            <p className="muted text-sm">
              مرحبًا بك، <span className="text-foreground font-medium">{u.name || u.email}</span> — يمكنك إدارة كافة عمليات المتجر بدقة وسلاسة.
            </p>
          </div>

          {/* أزرار الإجراءات العلوية */}
          <div className="flex items-center gap-3">
            <a 
              href="/" 
              target="_blank"
              rel="noopener noreferrer"
              className="btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border hairline hover:border-[var(--gold)] transition"
            >
              <Store size={16} className="text-[var(--gold)]" />
              <span>استعراض المتجر</span>
            </a>

            <form action="/api/admin/logout" method="post">
              <button 
                type="submit"
                className="btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition"
              >
                <LogOut size={16} />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </header>

        {/* مدير اللوحة المركزي */}
        <AdminManager />

      </div>
    </main>
  );
}
