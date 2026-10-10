'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminManager from '@/components/AdminManager';
import AdminTopbar from '@/components/AdminTopbar';
import { ShieldCheck, ArrowUpLeft, Package, Truck, RotateCcw, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function OperationsCenter() {
  const [snapshot, setSnapshot] = useState<{ pendingOrders: any[]; shipments: any[]; returns: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [shipmentsResponse, returnsResponse] = await Promise.all([
        fetch('/api/admin/shipments?includeOrders=1', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/admin/returns', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      const shipmentsData = await shipmentsResponse.json().catch(() => ({}));
      const returnsData = await returnsResponse.json().catch(() => ({}));
      if (!shipmentsResponse.ok || !returnsResponse.ok) throw new Error('تعذر تحديث بيانات مركز العمليات');
      setSnapshot({
        pendingOrders: Array.isArray(shipmentsData?.pendingOrders) ? shipmentsData.pendingOrders : [],
        shipments: Array.isArray(shipmentsData?.shipments) ? shipmentsData.shipments : [],
        returns: Array.isArray(returnsData) ? returnsData : [],
      });
      setError('');
    } catch (reason: any) {
      setError(reason?.message || 'تعذر الاتصال بمركز العمليات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const pendingShipments = snapshot?.shipments.filter(item => !['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'].includes(item.status)).length || 0;
  const activeReturns = snapshot?.returns.filter(item => ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(item.status)).length || 0;
  const alerts = [
    ...(snapshot?.pendingOrders.slice(0, 3).map(order => ({ key: `order-${order.id}`, href: `/admin/orders/${order.id}`, icon: Package, title: `طلب #${order.number} بانتظار إسناد الشحن`, detail: order.customerNameSnapshot || 'يحتاج إلى إنشاء شحنة' })) || []),
    ...(snapshot?.shipments.filter(item => ['FAILED', 'RETURNED'].includes(item.status)).slice(0, 2).map(shipment => ({ key: `shipment-${shipment.id}`, href: '/admin/logistics', icon: Truck, title: `شحنة الطلب #${shipment.order?.number || '—'} تحتاج متابعة`, detail: shipment.status === 'FAILED' ? 'تعذر التسليم' : 'تم إرجاعها للشاحن' })) || []),
    ...(snapshot?.returns.filter(item => ['REQUESTED', 'RECEIVED'].includes(item.status)).slice(0, 2).map(item => ({ key: `return-${item.id}`, href: '/admin/logistics', icon: RotateCcw, title: `مرتجع الطلب #${item.order?.number || '—'} يحتاج إجراء`, detail: item.status === 'REQUESTED' ? 'بانتظار المراجعة' : 'تم الاستلام ويحتاج معالجة' })) || []),
  ].slice(0, 5);

  return <section className="mt-5 rounded-[28px] border border-border/50 bg-[var(--surface)]/70 p-4 shadow-sm sm:p-5" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)]"><Truck size={18} /></span><div><div className="flex items-center gap-2"><h2 className="font-serif text-base font-bold sm:text-lg">مركز العمليات</h2><span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[9px] text-green-700 dark:text-green-300"><i className="h-1.5 w-1.5 rounded-full bg-current" /> متابعة مباشرة</span></div><p className="mt-1 text-[10px] text-muted-foreground">مؤشرات الشحن والمرتجعات تتحدث تلقائيًا كل 30 ثانية.</p></div></div>
      <div className="flex items-center gap-2"><button type="button" onClick={() => { setLoading(true); void refresh(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> تحديث</button><Link href="/admin/logistics" className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--gold)] px-3 py-2 text-[10px] font-bold text-[var(--gold-contrast)]">فتح مركز الشحن <ArrowUpLeft size={13} /></Link></div>
    </div>
    {error ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300"><CircleAlert size={15} />{error}</div> : <>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Link href="/admin/logistics" className="rounded-2xl border border-border/50 bg-[var(--bg)]/50 p-3 transition hover:border-[var(--gold)]/40"><p className="text-[10px] text-muted-foreground">طلبات بانتظار الشحن</p><b className="mt-1 block text-xl">{loading ? '—' : snapshot?.pendingOrders.length || 0}</b></Link><Link href="/admin/logistics" className="rounded-2xl border border-border/50 bg-[var(--bg)]/50 p-3 transition hover:border-[var(--gold)]/40"><p className="text-[10px] text-muted-foreground">شحنات نشطة</p><b className="mt-1 block text-xl">{loading ? '—' : pendingShipments}</b></Link><Link href="/admin/logistics" className="rounded-2xl border border-border/50 bg-[var(--bg)]/50 p-3 transition hover:border-[var(--gold)]/40"><p className="text-[10px] text-muted-foreground">مرتجعات مفتوحة</p><b className="mt-1 block text-xl">{loading ? '—' : activeReturns}</b></Link><Link href="/admin/orders" className="rounded-2xl border border-border/50 bg-[var(--bg)]/50 p-3 transition hover:border-[var(--gold)]/40"><p className="text-[10px] text-muted-foreground">إجمالي الشحنات</p><b className="mt-1 block text-xl">{loading ? '—' : snapshot?.shipments.length || 0}</b></Link></div>
      <div className="mt-4 border-t border-border/40 pt-4"><div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-bold"><CircleAlert size={14} className="text-[var(--gold)]" /> تنبيهات تحتاج إجراء</p><span className="text-[10px] text-muted-foreground">{alerts.length} تنبيه</span></div>{loading ? <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><RefreshCw size={14} className="animate-spin" /> جارٍ تحديث المؤشرات…</div> : alerts.length ? <div className="grid gap-2 sm:grid-cols-2">{alerts.map(item => { const Icon = item.icon; return <Link key={item.key} href={item.href} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-[var(--bg)]/40 p-3 transition hover:border-[var(--gold)]/40"><Icon size={15} className="mt-0.5 shrink-0 text-[var(--gold)]" /><span className="min-w-0"><b className="block truncate text-[11px]">{item.title}</b><small className="mt-1 block truncate text-[10px] text-muted-foreground">{item.detail}</small></span><ArrowUpLeft size={13} className="mr-auto shrink-0 text-muted-foreground" /></Link>; })}</div> : <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-300"><CheckCircle2 size={15} /> لا توجد تنبيهات تشغيلية حاليًا.</div>}</div>
    </>}
  </section>;
}

export default function Admin() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [initialTab, setInitialTab] = useState('analytics');
  const [initialTabReady, setInitialTabReady] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    const allowedTabs = new Set(['analytics', 'products', 'categories', 'orders', 'inventory', 'customers', 'customer-segments', 'homepage', 'offers', 'gift-cards', 'relations', 'reviews', 'newsletter', 'faq', 'contact', 'payments', 'shipping', 'media', 'users', 'features', 'redirects', 'security', 'settings']);
    if (requestedTab && allowedTabs.has(requestedTab)) setInitialTab(requestedTab);
    setInitialTabReady(true);
  }, []);

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

  if (authChecking || !user || !initialTabReady) {
    return <main className="wahaj-admin-loading" dir="rtl"><span className="wahaj-admin-loading__spinner" /><p>جارٍ التحقق من جلسة الإدارة…</p></main>;
  }

  return (
    <main className="wahaj-admin-page" dir="rtl">
      <div className="wahaj-admin-page__inner">
        <AdminTopbar />

        <AdminManager
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={user?.role}
          initialTab={initialTab}
          topContent={(<>
            <section className="wahaj-admin-page__welcome">
              <div className="wahaj-admin-page__welcome-copy">
                <span className="wahaj-admin-page__eyebrow"><ShieldCheck size={14} /> لوحة تحكم آمنة</span>
                <h1>أهلًا بعودتك، <span>{user?.name || user?.email}</span></h1>
                <p>تابع متجرك وأدر تفاصيله اليومية من مساحة عمل واحدة.</p>
              </div>
              <div className="wahaj-admin-page__welcome-actions">
                <span className="wahaj-admin-page__role"><ShieldCheck size={15} /><span>الصلاحية</span><b>{user?.role}</b></span>
              </div>
              <span className="wahaj-admin-page__ornament" aria-hidden="true">و</span>
            </section>
            <OperationsCenter />
          </>)}
        />
      </div>
    </main>
  );
}
