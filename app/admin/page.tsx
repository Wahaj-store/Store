'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AdminManager from '@/components/AdminManager';
import { Store, LogOut, ShieldCheck, ArrowUpLeft, Package, Truck } from 'lucide-react';
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
      .catch(() => router.replace('/admin/login'))
      .finally(() => { if (mounted) setAuthChecking(false); });
    return () => { mounted = false; };
  }, [router]);

  if (authChecking || !user) {
    return <main className="wahaj-admin-loading" dir="rtl"><span className="wahaj-admin-loading__spinner" /><p>جارٍ التحقق من جلسة الإدارة…</p></main>;
  }

  return (
    <main className="wahaj-admin-page" dir="rtl">
      <div className="wahaj-admin-page__inner">
        <header className="wahaj-admin-page__bar">
          <a href="/" className="wahaj-admin-page__identity">
            <span className="wahaj-admin-page__logo"><Image src="/images/wahaj.logo.png" alt="" fill sizes="42px" priority /></span>
            <span><b>وَهَج</b><small>لوحة تحكم المتجر</small></span>
          </a>
          <div className="wahaj-admin-page__bar-actions">
            <span className="wahaj-admin-page__secure"><i /> النظام يعمل</span>
            <a href="/" target="_blank" rel="noopener noreferrer" className="wahaj-admin-page__store-link"><Store size={16} /> <span>زيارة المتجر</span><ArrowUpLeft size={13} /></a>
            <form action="/api/admin/logout" method="post"><button type="submit" className="wahaj-admin-page__logout"><LogOut size={16} /><span>خروج</span></button></form>
          </div>
        </header>

        <AdminManager
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={user?.role}
          topContent={(
            <section className="wahaj-admin-page__welcome">
              <div className="wahaj-admin-page__welcome-copy">
                <span className="wahaj-admin-page__eyebrow"><ShieldCheck size={14} /> لوحة تحكم آمنة</span>
                <h1>أهلًا بعودتك، <span>{user?.name || user?.email}</span></h1>
                <p>تابع متجرك وأدر تفاصيله اليومية من مساحة عمل واحدة.</p>
              </div>
              <div className="wahaj-admin-page__welcome-actions">
                <span className="wahaj-admin-page__role"><ShieldCheck size={15} /><span>الصلاحية</span><b>{user?.role}</b></span>
                <a href="/admin/inventory" className="wahaj-admin-page__quick-link"><Package size={16} /> سجل المخزون</a>
                <a href="/admin/logistics" className="wahaj-admin-page__quick-link"><Truck size={16} /> الشحن والمرتجعات</a>
              </div>
              <span className="wahaj-admin-page__ornament" aria-hidden="true">و</span>
            </section>
          )}
        />
      </div>
    </main>
  );
}
