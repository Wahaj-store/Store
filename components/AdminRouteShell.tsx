'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Boxes, ChevronLeft, CircleHelp, CreditCard, FolderTree, Gift,
  Image as ImageIcon, LayoutDashboard, LayoutTemplate, Lock, Mail,
  MessageSquareQuote, Package, RefreshCw, Settings, Shield, ShoppingCart, Sliders,
  Tag, Truck, Users, X,
} from 'lucide-react';
import AdminTopbar from '@/components/AdminTopbar';

type NavItem = { label: string; tab: string; icon: typeof Package };
type NavGroup = { label: string; items: NavItem[] };
const groups: NavGroup[] = [
  { label: 'إدارة المتجر', items: [
    { label: 'نظرة عامة', tab: 'analytics', icon: LayoutDashboard },
    { label: 'المنتجات', tab: 'products', icon: Package },
    { label: 'التصنيفات', tab: 'categories', icon: FolderTree },
    { label: 'الطلبات', tab: 'orders', icon: ShoppingCart },
    { label: 'سجل المخزون', tab: 'inventory', icon: Boxes },
    { label: 'العملاء', tab: 'customers', icon: Users },
    { label: 'تقسيم العملاء', tab: 'customer-segments', icon: Users },
  ] },
  { label: 'المحتوى والعروض', items: [
    { label: 'إدارة الصفحة الرئيسية', tab: 'homepage', icon: LayoutTemplate },
    { label: 'العروض', tab: 'offers', icon: Tag },
    { label: 'بطاقات الهدايا', tab: 'gift-cards', icon: Gift },
    { label: 'ترشيحات المنتجات', tab: 'relations', icon: RefreshCw },
  ] },
  { label: 'التواصل والعملاء', items: [
    { label: 'المراجعات', tab: 'reviews', icon: MessageSquareQuote },
    { label: 'النشرة البريدية', tab: 'newsletter', icon: Mail },
    { label: 'الأسئلة الشائعة', tab: 'faq', icon: CircleHelp },
    { label: 'رسائل العملاء', tab: 'contact', icon: Mail },
  ] },
  { label: 'الشحن والدفع', items: [
    { label: 'طرق الدفع', tab: 'payments', icon: CreditCard },
    { label: 'الشحن والتوصيل', tab: 'shipping', icon: Truck },
    { label: 'الشحن والمرتجعات', tab: 'logistics', icon: Truck },
  ] },
  { label: 'الإعدادات والنظام', items: [
    { label: 'مكتبة الوسائط', tab: 'media', icon: ImageIcon },
    { label: 'المستخدمون والصلاحيات', tab: 'users', icon: Shield },
    { label: 'المزايا', tab: 'features', icon: Sliders },
    { label: 'إعادة التوجيه', tab: 'redirects', icon: RefreshCw },
    { label: 'الأمان والسجل', tab: 'security', icon: Lock },
    { label: 'الإعدادات', tab: 'settings', icon: Settings },
  ] },
];
const routeTabs: Record<string, string> = {
  '/admin/analytics': 'analytics',
  '/admin/contact': 'contact',
  '/admin/faq': 'faq',
  '/admin/inventory': 'inventory',
  '/admin/logistics': 'logistics',
  '/admin/media': 'media',
  '/admin/orders': 'orders',
  '/admin/products': 'products',
  '/admin/settings': 'settings',
  '/admin/shipping': 'shipping',
};

export default function AdminRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('analytics');
  const isStandaloneShell = pathname !== '' && pathname !== '/admin/login';

  useEffect(() => {
    if (!isStandaloneShell) {
      setChecking(false);
      return;
    }
    let active = true;
    setChecking(true);
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.authenticated || !data?.user) {
          router.replace('/admin/login');
          return;
        }
        if (active) setAuthenticated(true);
      })
      .catch(() => router.replace('/admin/login'))
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [isStandaloneShell, pathname, router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const syncActiveTab = () => {
      if (pathname === '/admin') {
        setActiveAdminTab(new URLSearchParams(window.location.search).get('tab') || 'analytics');
      } else {
        const activeTab = pathname.startsWith('/admin/orders/') ? 'orders' : pathname.startsWith('/admin/customers/') ? 'customers' : routeTabs[pathname];
        setActiveAdminTab(activeTab || '');
      }
    };
    syncActiveTab();
    window.addEventListener('popstate', syncActiveTab);
    return () => window.removeEventListener('popstate', syncActiveTab);
  }, [pathname]);

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      if (typeof tab === 'string') setActiveAdminTab(tab);
    };
    window.addEventListener('wahaj-admin-tab-change', handleTabChange);
    return () => window.removeEventListener('wahaj-admin-tab-change', handleTabChange);
  }, []);

  if (!isStandaloneShell) return <>{children}</>;
  if (checking || !authenticated) {
    return <main className="wahaj-admin-loading" dir="rtl"><span className="wahaj-admin-loading__spinner" /><p>جارٍ التحقق من جلسة الإدارة…</p></main>;
  }

  return (
    <div className="wahaj-admin-page" dir="rtl">
      <div className="wahaj-admin-page__inner">
        <AdminTopbar onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <div className="mt-4 flex min-h-[calc(100vh-130px)] items-start gap-4">
          {menuOpen && <button type="button" className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" />}
          <aside id="admin-navigation" className={`wahaj-admin__sidebar fixed inset-y-3 right-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(300px,calc(100vw-24px))] flex-col overflow-hidden border bg-card p-3 shadow-xl transition-transform md:static md:inset-y-auto md:right-auto md:top-auto md:z-10 md:max-h-none md:w-[245px] md:shrink-0 md:self-start md:translate-x-0 md:overflow-visible md:rounded-2xl md:shadow-sm ${menuOpen ? 'translate-x-0' : 'translate-x-[115%] md:translate-x-0'}`} aria-label="أقسام لوحة الإدارة">
            <div className="mb-3 flex items-center justify-between border-b border-border/50 px-2 pb-3">
              <div><b className="block text-sm">لوحة الإدارة</b><span className="text-[10px] text-muted-foreground">مساحة عمل المتجر</span></div>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/20 md:hidden" aria-label="إغلاق القائمة"><X size={17} /></button>
            </div>
            <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2 md:overflow-visible">
              {groups.map((group) => (
                <section key={group.label}>
                  <h2 className="mb-1.5 px-2 text-[10px] font-bold text-muted-foreground">{group.label}</h2>
                  <div className="space-y-1">
                    {group.items.map(({ label, tab, icon: Icon }) => {
                      const href = tab === 'inventory' ? '/admin/inventory' : tab === 'logistics' ? '/admin/logistics' : `/admin?tab=${encodeURIComponent(tab)}`;
                      const active = activeAdminTab === tab;
                      return <Link key={`${group.label}-${tab}`} href={href} onClick={() => { setActiveAdminTab(tab); setMenuOpen(false); window.dispatchEvent(new CustomEvent('wahaj-admin-tab-change', { detail: tab })); }} aria-current={active ? 'page' : undefined} className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs transition ${active ? 'bg-[var(--gold)] font-bold text-[var(--gold-contrast)]' : 'text-foreground/80 hover:bg-muted/15 hover:text-[var(--gold)]'}`}>
                        <Icon size={16} className={active ? '' : 'text-[var(--gold)]'} /><span className="flex-1">{label}</span><ChevronLeft size={13} className="opacity-60" />
                      </Link>;
                    })}
                  </div>
                </section>
              ))}
            </nav>
            <Link href="/admin" className="mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-border/50 px-3 text-xs text-muted-foreground hover:text-foreground"><LayoutDashboard size={15} /> العودة للوحة الرئيسية</Link>
          </aside>
          <section className="min-w-0 flex-1">{children}</section>
        </div>
      </div>
    </div>
  );
}
