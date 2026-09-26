// مسار الملف: app/admin/page.tsx

import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminManager from '@/components/AdminManager';
import { Store, LogOut, ShieldCheck, Sparkles, Menu } from 'lucide-react';

export default async function Admin() {
  const u = await getUser();
  
  if (!u || !u.active) {
    redirect('/admin/login');
  }

  return (
    <main className="min-h-screen py-12 px-4 md:px-8 bg-[var(--bg)] text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-7xl mx-auto space-y-8">
        
        {/* ترويسة لوحة التحكم الفاخرة */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck size={14} />
                لوحة الإدارة العليا
              </span>
              <span className="text-xs text-muted-foreground font-light">• الصلاحية: {u.role}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight flex items-center gap-2">
              <Sparkles size={22} className="text-[#D4AF37]" /> متجر وَهَج
            </h1>
            <p className="text-muted-foreground text-sm font-light">
              مرحبًا بك، <span className="text-foreground font-medium">{u.name || u.email}</span> — يمكنك إدارة كافة عمليات المتجر بدقة وسلاسة.
            </p>
          </div>

          {/* أزرار الإجراءات العلوية وزر القائمة في أقصى اليمين */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* زر قسّام لوحة التحكم في الأعلى بجانب الأزرار */}
            <label htmlFor="admin-sidebar-toggle" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs md:text-sm font-medium bg-[#D4AF37] text-black hover:opacity-95 transition shadow-sm cursor-pointer">
              <Menu size={16} />
              <span>قسّام لوحة التحكم</span>
            </label>

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

        {/* مدير اللوحة المركزي */}
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm">
          <AdminManager />
        </div>

      </div>
    </main>
  );
}
