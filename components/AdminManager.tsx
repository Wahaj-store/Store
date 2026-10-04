// مسار الملف: components/AdminManager.tsx

'use client';
import React, { useEffect, useState, ComponentType } from 'react';
import Link from 'next/link';
import { 
  GripVertical, Trash2, Upload, Plus, Save, Image as ImageIcon, Search, ChevronLeft,
  Package, FolderTree, Tag, CreditCard, Truck, LayoutTemplate, 
  MessageSquareQuote, Users, Shield, ShoppingCart, BarChart3, Sliders, 
  FileText, HelpCircle, Mail, Settings, Gift, RefreshCcw, Share2, Lock, LucideProps, Menu, X, TrendingUp, TrendingDown, PieChart, Bell, Command, Keyboard, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import MediaPicker from './MediaPicker';
import Image from 'next/image';

interface MenuGroup {
  title: string;
  items: [string, string, ComponentType<LucideProps>][];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'إدارة المتجر',
    items: [
      ['products', 'المنتجات', Package],
      ['categories', 'التصنيفات', FolderTree],
      ['orders', 'الطلبات', ShoppingCart],
      ['customers', 'العملاء', Users],
      ['customer-segments', 'تقسيم العملاء', Users],
    ]
  },
  {
    title: 'المحتوى والعروض',
    items: [
      ['homepage', 'Homepage Builder', LayoutTemplate],
      ['offers', 'العروض', Tag],
      ['gift-cards', 'بطاقات الهدايا', Gift],
      ['relations', 'ترشيحات المنتجات', Share2],
    ]
  },
  {
    title: 'التواصل والعملاء',
    items: [
      ['reviews', 'المراجعات', MessageSquareQuote],
      ['faq', 'الأسئلة الشائعة', HelpCircle],
      ['contact', 'رسائل العملاء', Mail],
    ]
  },
  {
    title: 'الشحن والدفع',
    items: [
      ['payments', 'طرق الدفع', CreditCard],
      ['shipping', 'الشحن والتوصيل', Truck],
    ]
  },
  {
    title: 'الإعدادات والنظام',
    items: [
      ['analytics', 'التحليلات', BarChart3],
      ['media', 'مكتبة الوسائط', ImageIcon],
      ['users', 'المستخدمون والصلاحيات', Shield],
      ['features', 'المزايا', Sliders],
      ['redirects', 'إعادة التوجيه', RefreshCcw],
      ['security', 'الأمان والسجل', Lock],
      ['settings', 'الإعدادات العامة', Settings],
    ]
  }
];

const emptyProduct: any = { 
  name: '', slug: '', description: '', price: '', comparePrice: '', 
  stock: 0, sku: '', categoryId: '', status: 'DRAFT', material: '', 
  careInstructions: '', seoTitle: '', seoDescription: '', images: [], variants: [] 
};

function toDateTimeLocal(value: unknown) {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoDateTime(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const OFFER_SEGMENTS = [
  ['vip', 'عملاء VIP'],
  ['loyal', 'عملاء أوفياء'],
  ['highValue', 'قيمة مرتفعة'],
  ['new', 'عملاء نشطون حديثًا'],
  ['atRisk', 'معرضون للفقد'],
  ['dormant', 'عملاء غير نشطين'],
  ['noPurchase', 'بدون شراء'],
] as const;

async function api(url: string, method = 'GET', body?: any) {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body instanceof FormData ? undefined : body ? { 'Content-Type': 'application/json' } : undefined,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) {
      if (typeof window !== 'undefined') window.location.assign('/admin/login');
      throw new Error(j.error || 'انتهت جلسة الإدارة.');
    }
    if (r.status === 403) throw new Error(j.error || 'غير مصرح: لا تملك صلاحية الوصول إلى هذا القسم.');
    throw new Error(j.error || 'حدث خطأ في النظام');
  }
  return j;
}

export default function AdminManager({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) {
  const [tab, setTab] = useState('products');
  const [data, setData] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if (event.key === 'Escape') { setCommandOpen(false); setNotificationsOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commandItems = menuGroups.flatMap(group => group.items.map(([key, label, Icon]) => ({ key, label, Icon, group: group.title })));
  const filteredCommandItems = commandItems.filter(item => {
    const q = commandQuery.trim().toLowerCase();
    return !q || item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
  }).slice(0, 8);

  const getCurrentTabLabel = () => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item[0] === tab);
      if (found) return found[1];
    }
    return '';
  };

  const getCurrentTabIcon = () => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item[0] === tab);
      if (found) return found[2];
    }
    return Package;
  };

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const map: Record<string, string> = {
        products: '/api/admin/products',
        categories: '/api/admin/categories',
        offers: '/api/admin/offers',
        payments: '/api/admin/payments',
        shipping: '/api/admin/shipping',
        homepage: '/api/admin/homepage',
        features: '/api/admin/features',
        redirects: '/api/admin/redirects',
        relations: '/api/admin/relations',
        'gift-cards': '/api/admin/gift-cards',
        security: '/api/admin/security',
        media: '/api/admin/media',
        reviews: '/api/admin/reviews',
        customers: '/api/admin/customers',
        'customer-segments': '/api/admin/customer-segments',
        users: '/api/admin/users',
        orders: '/api/admin/orders',
        analytics: '/api/admin/analytics',
        faq: '/api/admin/faq',
        contact: '/api/admin/contact',
        settings: '/api/admin/config'
      };

      const targetUrl = map[tab];
      if (!targetUrl) {
        setData([]);
        return;
      }

      const x = await api(targetUrl);
      if (tab === 'offers') {
        const audience = await api('/api/admin/offers/audience').catch(() => ({ targets: {} }));
        const targets = audience?.targets || {};
        setData((Array.isArray(x) ? x : [x]).map((offer: any) => ({
          ...offer,
          segmentKeys: Array.isArray(targets[offer.id]) ? targets[offer.id] : [],
        })));
      } else if (tab === 'settings') {
        const settings = x?.settings || {};
        setData(Object.entries(settings).map(([key, value]) => ({ id: `setting:${key}`, key, value })));
      } else {
        setData(Array.isArray(x) ? x : [x]);
      }
    } catch (e: any) {
      setMsg(e.message || 'حدث خطأ أثناء جلب البيانات');
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api('/api/admin/categories').then(setCats).catch(() => {});
    api('/api/admin/products').then((items) => setProducts(Array.isArray(items) ? items : [])).catch(() => {});
  }, [tab]);

  async function save(v: any) {
    try {
      let endpoint = `/api/admin/${tab}`;
      let method = v.id ? 'PUT' : 'POST';

      if (tab === 'products') {
        endpoint = v.id ? `/api/admin/products/${v.id}` : '/api/admin/products';
      } else if (tab === 'faq') {
        endpoint = v.id ? `/api/admin/faq/${v.id}` : '/api/admin/faq';
      } else if (tab === 'settings') {
        endpoint = '/api/admin/config';
        method = 'PUT';
        if (!String(v.key || '').trim()) throw new Error('مفتاح الإعداد مطلوب.');
        v = { settings: { [String(v.key).trim()]: String(v.value ?? '') } };
      } else if (tab === 'categories') {
        endpoint = v.id ? `/api/admin/categories` : '/api/admin/categories';
      }

      // datetime-local gives us a timezone-less local time. Convert it to an
      // explicit ISO timestamp before sending it to Vercel/Prisma (whose
      // runtime uses UTC), otherwise the selected clock time can shift by the
      // server timezone offset after saving.
      const payload = tab === 'offers'
        ? {
            ...v,
            startsAt: toIsoDateTime(v.startsAt),
            endsAt: toIsoDateTime(v.endsAt),
          }
        : v;

      const saved = await api(endpoint, method, payload);
      if (tab === 'offers' && saved?.id) {
        await api('/api/admin/offers/audience', 'PUT', {
          offerId: saved.id,
          segmentKeys: Array.isArray(v.segmentKeys) ? v.segmentKeys : [],
        });
      }
      setMsg('تم الحفظ بنجاح');
      setEditing(null);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function del(id: string) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      if (tab === 'contact') {
        await api(`/api/admin/contact?id=${id}`, 'DELETE');
      } else if (tab === 'faq') {
        await api(`/api/admin/faq/${id}`, 'DELETE');
      } else if (tab === 'products') {
        await api(`/api/admin/products/${id}`, 'DELETE');
      } else if (tab === 'settings') {
        const item = data.find((x: any) => x.id === id);
        if (!item?.key) throw new Error('تعذر تحديد مفتاح الإعداد.');
        await api('/api/admin/config', 'DELETE', { key: item.key });
      } else {
        await api(`/api/admin/${tab}`, 'DELETE', { id });
      }
      setMsg('تم الحذف بنجاح');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const j = await api('/api/admin/media', 'POST', fd);
    return j.url;
  }

  async function reorder(items: any[], endpoint: string) {
    const ordered = items.map((x, i) => ({ ...x, sortOrder: i }));
    setData(ordered);
    await api(endpoint, 'PUT', { reorder: true, items: ordered });
  }

  const getNewItemTemplate = () => {
    switch (tab) {
      case 'products': return emptyProduct;
      case 'categories': return { name: '', slug: '', description: '', image: '' };
      case 'offers': return { name: '', type: 'FLASH_SALE', discountType: 'PERCENTAGE', discountValue: 0, minOrder: '', maxDiscount: '', priority: 0, stackable: false, maxUses: '', productId: '', categoryId: '', buyQuantity: '', getQuantity: '', getDiscountPercent: 100, startsAt: '', endsAt: '', active: true, segmentKeys: [] };
      case 'gift-cards': return { code: '', amount: 0, expiresAt: '', active: true };
      case 'shipping': return { governorate: '', city: '', price: 0, freeAbove: 0 };
      case 'homepage': return { type: 'BANNER', title: '', subtitle: '', visible: true };
      case 'relations': return { type: 'RELATED', fromProductId: '', toProductId: '', sortOrder: 0 };
      case 'faq': return { question: '', answer: '', category: 'general', displayOrder: 0, published: true };
      case 'redirects': return { fromPath: '', toPath: '', statusCode: 301 };
      case 'settings': return { key: '', value: '' };
      default: return {};
    }
  };

  const CurrentTabIcon = getCurrentTabIcon();
  const currentTabLabel = getCurrentTabLabel();
  const canCreate = ['products', 'categories', 'offers', 'shipping', 'homepage', 'gift-cards', 'relations', 'faq', 'redirects', 'settings'].includes(tab);

  return (
    <div className="min-h-[calc(100vh-1rem)] bg-[var(--bg)]" dir="rtl">
      {/* Mobile navigation backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق قائمة لوحة الإدارة"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/55 backdrop-blur-[4px] lg:hidden"
        />
      )}

      {/* Mobile-only global bar. The page title intentionally lives below it. */}
      <div className="sticky top-0 z-30 px-2 pt-2 lg:hidden sm:px-4">
        <header className="flex min-h-[64px] items-center justify-between gap-3 rounded-[24px] border border-border/50 bg-[var(--bg)]/95 px-3 shadow-sm backdrop-blur-xl sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-muted/10 text-foreground transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"
            aria-label="فتح قائمة لوحة الإدارة"
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--gold)]/25 bg-muted/10 p-1.5">
              <Image src="/images/wahaj.logo.png" alt="Wahaj Store" fill sizes="40px" className="object-contain" />
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-serif font-bold text-foreground">Wahaj Store</p>
              <p className="truncate text-[10px] text-muted-foreground">لوحة الإدارة</p>
            </div>
          </div>

          <button type="button" onClick={() => { setCommandOpen(true); setCommandQuery(''); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-muted/10 text-foreground transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)]" aria-label="البحث السريع"><Search size={18} /></button>
        </header>
      </div>

      <div className="mx-auto flex max-w-[1900px] gap-4 px-2 pb-8 pt-2 sm:px-4 lg:gap-5 lg:px-5 lg:pt-4 xl:px-6">
        {/* Right navigation rail */}
        <aside
          className={`fixed inset-y-2 right-2 z-50 flex flex-col overflow-hidden rounded-[30px] border border-border/50 bg-[var(--bg)] shadow-2xl transition-[transform,width] duration-300 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:shrink-0 lg:translate-x-0 lg:shadow-sm ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
          } ${sidebarCollapsed ? 'lg:w-[92px]' : 'w-[306px] lg:w-[306px]'}`}
        >
          {/* Brand / rail controls */}
          <div className={`border-b border-border/40 ${sidebarCollapsed ? 'p-3' : 'p-4 sm:p-5'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
              {!sidebarCollapsed && (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-muted/10 p-1.5">
                    <Image src="/images/wahaj.logo.png" alt="Wahaj Store" fill sizes="44px" className="object-contain" priority />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-serif font-bold text-foreground">Wahaj Store</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">نظام إدارة المتجر</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-muted/10 text-muted-foreground transition hover:border-[var(--gold)]/35 hover:text-[var(--gold)] lg:flex"
                  aria-label={sidebarCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
                  title={sidebarCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
                >
                  {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronLeft size={16} className="rotate-180" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/20 hover:text-foreground lg:hidden"
                  aria-label="إغلاق القائمة"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-4 custom-scrollbar sm:px-3">
            {!sidebarCollapsed && (
              <div className="mb-5 rounded-2xl border border-[var(--gold)]/15 bg-[var(--gold)]/5 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--gold)]">لوحة الإدارة</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                </div>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">إدارة المتجر من مساحة واحدة منظمة وواضحة.</p>
              </div>
            )}

            <nav className="space-y-5" aria-label="أقسام لوحة الإدارة">
              {menuGroups.map((group) => (
                <section key={group.title}>
                  {!sidebarCollapsed ? (
                    <div className="mb-2.5 flex items-center gap-2 px-2" dir="rtl">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]/65" />
                      <h3 className="min-w-0 text-right text-[10px] font-bold tracking-[0.04em] text-muted-foreground">{group.title}</h3>
                      <span className="h-px flex-1 bg-border/35" />
                    </div>
                  ) : (
                    <div className="mb-2 flex justify-center" aria-hidden="true">
                      <span className="h-px w-8 bg-[var(--gold)]/35" />
                    </div>
                  )}

                  <div className="space-y-1">
                    {group.items.map(([k, t, Icon]) => {
                      const active = tab === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          dir="rtl"
                          onClick={() => { setTab(k); setEditing(null); setMsg(''); setSidebarOpen(false); }}
                          aria-current={active ? 'page' : undefined}
                          title={sidebarCollapsed ? t : undefined}
                          className={`group relative flex w-full items-center rounded-2xl transition-all ${
                            sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            active
                              ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/15 hover:text-foreground'
                          }`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-black/8' : 'bg-[var(--gold)]/8 text-[var(--gold)]'}`}>
                            <Icon size={16} />
                          </span>
                          {!sidebarCollapsed && <span className="min-w-0 flex-1 text-right text-xs">{t}</span>}
                          {!sidebarCollapsed && active && <ChevronLeft size={14} className="shrink-0 opacity-75" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </div>

          <div className={`${sidebarCollapsed ? 'p-2.5' : 'p-3 sm:p-4'} border-t border-border/40`}>
            <div className={`flex items-center rounded-2xl border border-border/40 bg-muted/10 ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-3'}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Shield size={15} />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-foreground">وضع الإدارة</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">الوصول محمي بالصلاحيات</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="min-w-0 flex-1 space-y-4 lg:space-y-5">
          {/* Desktop global header. No menu button beside the page title. */}
          <header className="hidden min-h-[68px] items-center justify-between gap-4 rounded-[26px] border border-border/50 bg-[var(--bg)]/95 px-5 shadow-sm backdrop-blur-xl lg:flex xl:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <CurrentTabIcon size={18} />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] text-muted-foreground">لوحة الإدارة</p>
                <p className="truncate text-sm font-bold text-foreground">{currentTabLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setCommandOpen(true); setCommandQuery(''); }} className="hidden h-10 min-w-[190px] items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/10 px-3 text-[10px] text-muted-foreground transition hover:border-[var(--gold)]/30 sm:flex" aria-label="فتح البحث السريع">
                <span className="flex items-center gap-2"><Search size={14} /> بحث سريع في لوحة الإدارة</span><kbd className="rounded-md border border-border/50 px-1.5 py-0.5 text-[9px]">Ctrl K</kbd>
              </button>
              <div className="relative">
                <button type="button" onClick={() => setNotificationsOpen(v => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-muted/10 text-muted-foreground transition hover:border-[var(--gold)]/30 hover:text-[var(--gold)]" aria-label="التنبيهات"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--gold)]" /></button>
                {notificationsOpen && <div className="absolute left-0 top-12 z-[70] w-[290px] rounded-2xl border border-border/50 bg-[var(--bg)] p-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border/30 px-2 pb-3"><b className="text-xs text-foreground">مركز التنبيهات</b><span className="rounded-full bg-[var(--gold)]/10 px-2 py-1 text-[9px] text-[var(--gold)]">مباشر</span></div>
                  <div className="space-y-1 pt-2"><div className="flex gap-3 rounded-xl p-2.5 hover:bg-muted/10"><Clock size={15} className="mt-0.5 text-[var(--gold)]" /><div><p className="text-[11px] font-medium">بيانات القسم الحالي جاهزة</p><p className="mt-0.5 text-[9px] text-muted-foreground">يتم تحديث البيانات عند تغيير القسم</p></div></div><div className="flex gap-3 rounded-xl p-2.5 hover:bg-muted/10"><CheckCircle2 size={15} className="mt-0.5 text-green-600" /><div><p className="text-[11px] font-medium">النظام متصل</p><p className="mt-0.5 text-[9px] text-muted-foreground">جلسة الإدارة محمية بالصلاحيات</p></div></div></div>
                </div>}
              </div>
              <div className="hidden rounded-full border border-border/40 bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground xl:flex xl:items-center xl:gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" /><span>Wahaj Admin</span></div>
            </div>
          </header>

          {/* Page header */}
          <section className="rounded-[30px] border border-border/50 bg-[var(--bg)] p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/8 text-[var(--gold)] sm:h-14 sm:w-14">
                  <CurrentTabIcon size={22} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-serif font-bold text-foreground sm:text-2xl lg:text-[26px]">{currentTabLabel}</h1>
                    <span className="rounded-full border border-border/50 bg-muted/10 px-2.5 py-1 text-[9px] text-muted-foreground">
                      {data.length} عنصر
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-xs leading-6 text-muted-foreground">
                    إدارة القسم ومتابعة بياناته من مساحة عمل موحدة، مع الحفاظ على جميع العمليات والصلاحيات الحالية.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                  <span>التغييرات تُحفظ مباشرة عبر النظام.</span>
                </div>
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
                      جارٍ التحديث…
                    </div>
                  )}
                  {!editing && canCreate && (
                    <button
                      type="button"
                      onClick={() => setEditing(getNewItemTemplate())}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-xs font-bold text-[var(--gold-contrast)] shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
                    >
                      <Plus size={16} />
                      <span>إضافة جديدة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {msg && (
            <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-medium shadow-sm ${msg.includes('خطأ') || msg.includes('تعذر') ? 'border-red-500/20 bg-red-500/5 text-red-600' : 'border-green-500/20 bg-green-500/5 text-green-600'}`}>
              {msg.includes('خطأ') || msg.includes('تعذر') ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}<span>{msg}</span>
            </div>
          )}

          {/* Content workspace */}
          <section className="overflow-hidden rounded-[30px] border border-border/50 bg-[var(--bg)] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/35 px-5 py-4 sm:px-6">
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">مساحة العمل</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">الأدوات والمحتوى الخاص بالقسم الحالي</p>
              </div>
              <div className="hidden rounded-full border border-border/40 bg-muted/10 px-2.5 py-1 text-[9px] text-muted-foreground sm:block">
                {currentTabLabel}
              </div>
            </div>

            <div className="p-2 sm:p-3 lg:p-4">
              {loading ? (
                <div className="rounded-[26px] border border-border/40 bg-muted/5 p-16 text-center text-sm text-muted-foreground">
                  <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-border/50 border-t-[var(--gold)]" />
                  جارٍ تحميل بيانات القسم…
                </div>
              ) : editing ? (
                <div className="rounded-[26px] border border-border/40 bg-[var(--bg)] p-1 shadow-sm md:p-2">
                  <Editor tab={tab} value={editing} cats={cats} products={products} onCancel={() => setEditing(null)} onSave={save} upload={upload} />
                </div>
              ) : (
                <div className="rounded-[26px] border border-border/40 bg-[var(--bg)] p-1 shadow-sm md:p-2">
                  <Content tab={tab} data={data} onEdit={setEditing} onDelete={del} onRefresh={load} onReorder={reorder} />
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      {commandOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-3 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setCommandOpen(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-border/50 bg-[var(--bg)] shadow-2xl" dir="rtl" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3.5"><Command size={18} className="text-[var(--gold)]" /><input autoFocus value={commandQuery} onChange={e => setCommandQuery(e.target.value)} placeholder="ابحث عن قسم أو أداة..." className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" /><kbd className="rounded-lg border border-border/50 px-2 py-1 text-[9px] text-muted-foreground">ESC</kbd></div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredCommandItems.map(item => { const Icon = item.Icon; return <button key={item.key} type="button" onClick={() => { setTab(item.key); setEditing(null); setCommandOpen(false); setCommandQuery(''); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition ${tab === item.key ? 'bg-[var(--gold)]/10 text-[var(--gold)]' : 'text-foreground hover:bg-muted/10'}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/10"><Icon size={15} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{item.label}</span><span className="mt-0.5 block text-[9px] text-muted-foreground">{item.group}</span></span><ChevronLeft size={14} className="text-muted-foreground" /></button>; })}
              {!filteredCommandItems.length && <div className="p-10 text-center text-xs text-muted-foreground">لا توجد نتائج مطابقة.</div>}
            </div>
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-2.5 text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><Keyboard size={12} /> للتنقل السريع</span><span>Ctrl + K</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Editor({ tab, value, cats, products, onCancel, onSave, upload }: any) {
  const [v, setV] = useState({ 
    ...value, 
    images: value.images || [], 
    variants: value.variants || [] 
  });
  const [saving, setSaving] = useState(false);
  const initialSnapshot = JSON.stringify({ ...value, images: value.images || [], variants: value.variants || [] });
  const currentSnapshot = JSON.stringify(v);
  const dirty = currentSnapshot !== initialSnapshot;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(v);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x }));
  const addVar = () => set('variants', [...v.variants, { name: 'اللون', value: '', stock: 0, price: '' }]);

  if (tab === 'settings') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <h3 className="font-serif font-bold text-lg text-[var(--gold)]">إعدادات المتجر العامة</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المفتاح (Key)" value={v.key || ''} onChange={(x: any) => set('key', x)} />
        <Field label="القيمة (Value)" value={v.value || ''} onChange={(x: any) => set('value', x)} />
      </div>
      <div className="flex gap-3 pt-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ الإعداد</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'faq') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <h3 className="font-serif font-bold text-lg text-[var(--gold)]">{v.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="السؤال" value={v.question || ''} onChange={(x: any) => set('question', x)} />
        <label className="text-xs md:text-sm font-medium text-muted-foreground">القسم
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.category || 'general'} onChange={e => set('category', e.target.value)}>
            <option value="general">عام</option>
            <option value="shipping">الشحن والتوصيل</option>
            <option value="payment">الدفع</option>
            <option value="returns">الاستبدال والاسترجاع</option>
            <option value="products">المنتجات</option>
          </select>
        </label>
        <Field label="ترتيب الظهور" type="number" value={v.displayOrder ?? 0} onChange={(x: any) => set('displayOrder', Number(x))} />
        <label className="flex items-center gap-2.5 pt-6 text-sm font-light cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={!!v.published} onChange={e => set('published', e.target.checked)} /> منشور في المتجر
        </label>
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الإجابة
          <textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] min-h-28" value={v.answer || ''} onChange={e => set('answer', e.target.value)} />
        </label>
      </div>
      <div className="flex gap-3 pt-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'payments') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="اسم الطريقة" value={v.label} onChange={(x: any) => set('label', x)} />
        <Field label="ترتيب الظهور" value={v.displayOrder || 0} onChange={(x: any) => set('displayOrder', x)} type="number" />
        <Field label="اسم الحساب" value={v.accountName || ''} onChange={(x: any) => set('accountName', x)} />
        <Field label="رقم/معرف الحساب" value={v.accountNumber || ''} onChange={(x: any) => set('accountNumber', x)} />
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الوصف<textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.description || ''} onChange={e => set('description', e.target.value)} /></label>
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">تعليمات الدفع<textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] min-h-28" value={v.instructions || ''} onChange={e => set('instructions', e.target.value)} /></label>
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={!!v.enabled} onChange={e => set('enabled', e.target.checked)} /> مفعلة</label>
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={!!v.proofRequired} onChange={e => set('proofRequired', e.target.checked)} /> طلب إثبات دفع</label>
      </div>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'gift-cards') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="القيمة"
          value={v.amount ?? ''}
          onChange={(x: any) => set('amount', x)}
          type="number"
        />

        <label className="text-xs md:text-sm font-medium text-muted-foreground space-y-1 block">
          تاريخ الانتهاء
          <input
            className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={v.expiresAt ? String(v.expiresAt).slice(0, 10) : ''}
            onChange={e => set('expiresAt', e.target.value ? `${e.target.value}T23:59:59.000Z` : '')}
          />
          <span className="block mt-1 text-[11px] text-muted-foreground">اختاري التاريخ مباشرة من التقويم.</span>
        </label>

        <div className="md:col-span-2 rounded-2xl bg-[var(--bg)] border border-[var(--gold)]/20 p-4">
          <p className="text-xs text-muted-foreground">كود البطاقة</p>
          {v.id ? (
            <p className="mt-1 font-mono text-base tracking-wider text-foreground" dir="ltr">{v.code}</p>
          ) : (
            <p className="mt-1 text-sm font-medium text-[var(--gold)]">سيتم إنشاء كود البطاقة تلقائيًا عند الحفظ.</p>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={v.active !== false} onChange={e => set('active', e.target.checked)} />
          البطاقة مفعلة
        </label>
      </div>

      {v.id && (
        <div className="rounded-2xl bg-[var(--bg)] border border-border/40 p-4">
          <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
          <p className="mt-1 text-lg font-serif font-bold text-[var(--gold)]">{Number(v.balance || 0).toLocaleString('ar-EG')} ج.م</p>
          <p className="mt-1 text-[11px] text-muted-foreground">لا يمكن تعديل القيمة الأصلية بعد الإصدار.</p>
        </div>
      )}

      <div className="mt-5 flex gap-3 pt-4 border-t border-border/30">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  const common: any = { 
    relations: [['type', 'نوع العلاقة'], ['fromProductId', 'المنتج الأساسي'], ['toProductId', 'المنتج المقترح'], ['sortOrder', 'الترتيب']], 
    categories: [['name', 'اسم التصنيف'], ['slug', 'Slug'], ['description', 'الوصف'], ['sortOrder', 'الترتيب']], 
    offers: [['name', 'اسم العرض'], ['type', 'نوع العرض'], ['discountValue', 'قيمة الخصم'], ['startsAt', 'يبدأ'], ['endsAt', 'ينتهي']], 
    shipping: [['governorate', 'المحافظة'], ['city', 'المدينة'], ['price', 'سعر الشحن'], ['freeAbove', 'مجاني فوق']], 
    homepage: [['type', 'نوع القسم'], ['title', 'العنوان'], ['subtitle', 'الوصف'], ['ctaText', 'نص الزر'], ['ctaUrl', 'رابط الزر'], ['sortOrder', 'الترتيب']], 
    redirects: [['fromPath', 'المسار القديم'], ['toPath', 'المسار الجديد'], ['statusCode', 'كود التحويل']] 
  };

  if (tab === 'offers') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="اسم العرض" value={v.name || ''} onChange={(x: any) => set('name', x)} />
        <label className="text-xs md:text-sm font-medium text-muted-foreground">نوع العرض
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.type || 'FLASH_SALE'} onChange={e => set('type', e.target.value)}>
            <option value="FLASH_SALE">تخفيض مباشر</option>
            <option value="BUY_X_GET_Y">اشترِ X واحصل على Y</option>
            <option value="FREE_SHIPPING">شحن مجاني</option>
            <option value="FIRST_ORDER">أول طلب</option>
            <option value="SEASONAL">موسمي</option>
          </select>
        </label>
        <label className="text-xs md:text-sm font-medium text-muted-foreground">نوع الخصم
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.discountType || 'PERCENTAGE'} onChange={e => set('discountType', e.target.value)}>
            <option value="PERCENTAGE">نسبة مئوية</option>
            <option value="FIXED">قيمة ثابتة</option>
          </select>
        </label>
        {v.type !== 'FREE_SHIPPING' && v.type !== 'BUY_X_GET_Y' && <Field label="قيمة الخصم" value={v.discountValue ?? ''} onChange={(x: any) => set('discountValue', x)} type="number" />}
        <Field label="الحد الأدنى للطلب" value={v.minOrder ?? ''} onChange={(x: any) => set('minOrder', x)} type="number" />
        <Field label="أقصى خصم" value={v.maxDiscount ?? ''} onChange={(x: any) => set('maxDiscount', x)} type="number" />
        <Field label="الأولوية" value={v.priority ?? 0} onChange={(x: any) => set('priority', x)} type="number" />
        <Field label="الحد الأقصى للاستخدام" value={v.maxUses ?? ''} onChange={(x: any) => set('maxUses', x)} type="number" />
        {v.type === 'BUY_X_GET_Y' && <>
          <Field label="اشترِ عدد" value={v.buyQuantity ?? ''} onChange={(x: any) => set('buyQuantity', x)} type="number" />
          <Field label="احصل على عدد" value={v.getQuantity ?? ''} onChange={(x: any) => set('getQuantity', x)} type="number" />
          <Field label="نسبة خصم الوحدات المجانية" value={v.getDiscountPercent ?? 100} onChange={(x: any) => set('getDiscountPercent', x)} type="number" />
        </>}
        <label className="text-xs md:text-sm font-medium text-muted-foreground">المنتج المستهدف
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.productId || ''} onChange={e => set('productId', e.target.value)}>
            <option value="">كل المنتجات</option>
            {products.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="text-xs md:text-sm font-medium text-muted-foreground">التصنيف المستهدف
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.categoryId || ''} onChange={e => set('categoryId', e.target.value)}>
            <option value="">كل التصنيفات</option>
            {cats.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <div className="md:col-span-2 rounded-2xl bg-[var(--bg)] border border-[var(--gold)]/20 p-4 space-y-3">
          <div>
            <p className="text-sm font-serif font-bold text-[var(--gold)]">الجمهور المستهدف</p>
            <p className="text-[11px] text-muted-foreground mt-1">اتركيه بدون اختيار ليعمل العرض مع كل العملاء.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {OFFER_SEGMENTS.map(([key, label]) => (
              <label key={key} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${Array.isArray(v.segmentKeys) && v.segmentKeys.includes(key) ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-border/40 bg-muted/10'}`}>
                <input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={Array.isArray(v.segmentKeys) && v.segmentKeys.includes(key)} onChange={e => {
                  const current = Array.isArray(v.segmentKeys) ? v.segmentKeys : [];
                  set('segmentKeys', e.target.checked ? [...current, key] : current.filter((x: string) => x !== key));
                }} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <label className="text-xs md:text-sm font-medium text-muted-foreground">يبدأ
          <input type="datetime-local" className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={toDateTimeLocal(v.startsAt)} onChange={e => set('startsAt', e.target.value)} />
          <span className="block mt-1 text-[11px] text-muted-foreground">الوقت يُحفظ بنفس الساعة التي تختارينها.</span>
        </label>
        <label className="text-xs md:text-sm font-medium text-muted-foreground">ينتهي
          <input type="datetime-local" className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={toDateTimeLocal(v.endsAt)} onChange={e => set('endsAt', e.target.value)} />
          <span className="block mt-1 text-[11px] text-muted-foreground">الوقت يُحفظ بنفس الساعة التي تختارينها.</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-5 pt-2">
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={!!v.stackable} onChange={e => set('stackable', e.target.checked)} /> قابل للدمج مع العروض الأخرى</label>
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={v.active !== false} onChange={e => set('active', e.target.checked)} /> مفعّل</label>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">العروض تُطبّق على السيرفر فقط، وتُراجع الصلاحية والمدة والحد الأقصى للاستخدام أثناء إنشاء الطلب.</p>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'redirects') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المسار القديم" value={v.fromPath || ''} onChange={(x: any) => set('fromPath', x)} />
        <Field label="المسار الجديد" value={v.toPath || ''} onChange={(x: any) => set('toPath', x)} />
        <Field label="كود التحويل" value={v.statusCode || 301} onChange={(x: any) => set('statusCode', x)} type="number" />
      </div>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
      <EditorToolbar tab={tab} dirty={dirty} saving={saving} onSave={save} onCancel={onCancel} />
      <div className="grid gap-4 md:grid-cols-2">
        {tab === 'products' ? (
          <>
            <Field label="اسم المنتج" value={v.name} onChange={(x: any) => set('name', x)} />
            <Field label="Slug" value={v.slug} onChange={(x: any) => set('slug', x)} />
            <Field label="SKU" value={v.sku} onChange={(x: any) => set('sku', x)} />
            <Field label="السعر" value={v.price} onChange={(x: any) => set('price', x)} type="number" />
            <Field label="السعر قبل الخصم" value={v.comparePrice} onChange={(x: any) => set('comparePrice', x)} type="number" />
            <Field label="المخزون" value={v.stock} onChange={(x: any) => set('stock', x)} type="number" />
            <label className="text-xs md:text-sm font-medium text-muted-foreground">التصنيف
              <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">اختر التصنيف</option>
                {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-xs md:text-sm font-medium text-muted-foreground">الحالة
              <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" value={v.status} onChange={e => set('status', e.target.value)}>
                {['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'].map((x: any) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <Field label="الخامة" value={v.material} onChange={(x: any) => set('material', x)} />
            <Field label="تعليمات العناية" value={v.careInstructions} onChange={(x: any) => set('careInstructions', x)} />
            <Field label="SEO Title" value={v.seoTitle} onChange={(x: any) => set('seoTitle', x)} />
            <Field label="SEO Description" value={v.seoDescription} onChange={(x: any) => set('seoDescription', x)} />
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {[['featured', 'مميز'], ['newArrival', 'وصل حديثًا'], ['bestSeller', 'الأكثر مبيعًا']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2.5 text-sm font-light cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--gold)]" checked={!!v[k]} onChange={e => set(k, e.target.checked)} />{l}
                </label>
              ))}
            </div>
            <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الوصف
              <textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] min-h-28" value={v.description || ''} onChange={e => set('description', e.target.value)} />
            </label>
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-serif font-bold text-[var(--gold)]">صور المنتج</p>
              <div className="flex flex-wrap gap-3">
                {v.images.map((im: any, i: number) => (
                  <div key={i} className="relative">
                    <Image src={im.url} width={96} height={96} alt={im.alt || v.name || "صورة المنتج"} className="h-24 w-24 rounded-2xl object-cover border border-border/60 shadow-xs" />
                    <button className="absolute -top-2 -end-2 rounded-full bg-red-500 w-6 h-6 flex items-center justify-center text-white text-xs font-bold shadow-xs cursor-pointer" onClick={() => set('images', v.images.filter((_: any, j: number) => j !== i))}>×</button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <MediaPicker multiple value={v.images.map((x: any) => x.url)} onChange={(urls: any) => set('images', urls.map((url: string) => ({ url, alt: v.name })))} />
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-3 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <b className="font-serif font-bold text-sm text-[var(--gold)]">Variants / الخيارات</b>
                <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={addVar}>+ إضافة خيار</button>
              </div>
              {v.variants.map((x: any, i: number) => (
                <div className="grid gap-2.5 md:grid-cols-5 items-center p-3 rounded-2xl bg-[var(--bg)] border border-border/60 shadow-xs" key={i}>
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" placeholder="النوع" value={x.name} onChange={e => { const a = [...v.variants]; a[i].name = e.target.value; set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" placeholder="القيمة" value={x.value} onChange={e => { const a = [...v.variants]; a[i].value = e.target.value; set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" type="number" placeholder="المخزون" value={x.stock} onChange={e => { const a = [...v.variants]; a[i].stock = Number(e.target.value); set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" type="number" placeholder="سعر خاص" value={x.price ?? ""} onChange={e => { const a = [...v.variants]; a[i].price = e.target.value === '' ? null : Number(e.target.value); set('variants', a); }} />
                  <div className="flex gap-2">
                    <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" placeholder="SKU" value={x.sku || ""} onChange={e => { const a = [...v.variants]; a[i].sku = e.target.value; set('variants', a); }} />
                    <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => set('variants', v.variants.filter((_: any, j: number) => j !== i))}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          common[tab]?.map((f: any) => <Field key={f[0]} label={f[1]} value={v[f[0]] ?? ''} onChange={(x: any) => set(f[0], x)} />)
        )}
      </div>

      {tab === 'categories' && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-sm font-medium text-muted-foreground">صورة التصنيف</p>
          <MediaPicker value={v.imageUrl || ""} onChange={(url: any) => set('imageUrl', url)} />
        </div>
      )}

      {tab === 'homepage' && (
        <>
          <Select label="الظهور" value={String(v.visible !== false)} options={['true', 'false']} onChange={(x: any) => set('visible', x === 'true')} />
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">صورة القسم</p>
            <MediaPicker value={v.imageUrl || ""} onChange={(url: any) => set('imageUrl', url)} />
          </div>
        </>
      )}

      <div className="mt-6 flex gap-3 pt-4 border-t border-border/30">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={save}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );
}

function EditorToolbar({ tab, dirty, saving, onSave, onCancel }: any) {
  const labels: Record<string, string> = {
    settings: 'إعدادات المتجر العامة', faq: 'الأسئلة الشائعة', payments: 'طريقة الدفع',
    'gift-cards': 'بطاقة هدايا', offers: 'العرض', redirects: 'إعادة توجيه',
    products: 'المنتج', categories: 'التصنيف', shipping: 'الشحن', homepage: 'محتوى الصفحة الرئيسية',
    relations: 'ترشيحات المنتجات', features: 'الميزة', reviews: 'المراجعة', contact: 'رسالة العميل'
  };
  return (
    <div className="sticky top-2 z-20 mb-5 flex flex-col gap-3 rounded-2xl border border-border/50 bg-[var(--bg)]/95 p-3 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{labels[tab] || 'تحرير البيانات'}</p>
          <p className="text-xs text-muted-foreground">{dirty ? 'لديك تغييرات غير محفوظة' : 'كل التغييرات محفوظة'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-border/60 bg-muted/10 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/20 cursor-pointer">إلغاء</button>
        <button type="button" onClick={onSave} disabled={!dirty || saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2 text-sm font-bold text-[var(--gold-contrast)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          {saving ? <><RefreshCcw size={15} className="animate-spin" /> جارٍ الحفظ...</> : <><Save size={15} /> حفظ التغييرات</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: any) {
  return (
    <label className="text-xs md:text-sm font-medium text-muted-foreground space-y-1 block">
      {label}
      <input className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }: any) {
  return (
    <label className="mt-4 block text-xs md:text-sm font-medium text-muted-foreground space-y-1">
      {label}
      <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[var(--gold)] transition shadow-xs" value={value} onChange={e => onChange(e.target.value)}>
        {options.map((x: string) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );
}


function getOfferState(offer: any) {
  const now = new Date();
  if (!offer.active) return { label: 'موقوف يدويًا', tone: 'muted' };
  if (offer.startsAt && new Date(offer.startsAt) > now) return { label: 'لم يبدأ بعد', tone: 'amber' };
  if (offer.endsAt && new Date(offer.endsAt) < now) return { label: 'منتهي', tone: 'red' };
  if (offer.maxUses != null && Number(offer.usedCount || 0) >= Number(offer.maxUses)) return { label: 'اكتمل الاستخدام', tone: 'red' };
  return { label: 'مفعّل ومتاح', tone: 'green' };
}

function offerStateClass(tone: string) {
  if (tone === 'green') return 'text-green-600 border-green-500/20 bg-green-500/10';
  if (tone === 'red') return 'text-red-500 border-red-500/20 bg-red-500/10';
  if (tone === 'amber') return 'text-amber-600 border-amber-500/20 bg-amber-500/10';
  return 'text-muted-foreground border-border/40 bg-muted/20';
}

async function toggleOfferActive(offer: any, onRefresh: () => void) {
  try {
    await api('/api/admin/offers', 'PATCH', { id: offer.id, active: !offer.active });
    onRefresh();
  } catch (e: any) {
    if (typeof window !== 'undefined') window.alert(e?.message || 'تعذر تغيير حالة العرض.');
  }
}

function DataWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-border/50 bg-[var(--bg)] shadow-sm">
      {children}
    </div>
  );
}

function DataToolbar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/40 bg-muted/5 p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative min-w-0 flex-1 md:max-w-xl">
        <Search size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder || 'بحث...'}
          className="w-full rounded-2xl border border-border/60 bg-[var(--bg)] py-3 pr-10 pl-4 text-sm text-foreground outline-none transition focus:border-[var(--gold)]"
        />
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

function Content({ tab, data, onEdit, onDelete, onRefresh, onReorder }: any) {
  if (tab === 'analytics') return <Analytics data={data[0] || {}} />;
  if (tab === 'customer-segments') return <CustomerSegments data={data[0] || {}} onRefresh={onRefresh} />;
  if (tab === 'media') return <Media data={data} onDelete={onDelete} onRefresh={onRefresh} />;

  const [query, setQuery] = useState('');

  const rows = Array.isArray(data) ? data : [];
  const filtered = rows.filter((x: any) => {
    if (!query.trim()) return true;
    const haystack = [
      x.name, x.title, x.code, x.sku, x.slug, x.governorate, x.type, x.key,
      x.customerNameSnapshot, x.number, x.email
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const isProducts = tab === 'products';
  const isOrders = tab === 'orders';

  const getTitle = (x: any) =>
    isProducts ? (x.name || 'منتج') :
    isOrders ? `طلب #${x.number ?? x.id}` :
    (x.name || x.title || x.code || x.governorate || x.type || x.key || '—');

  const getMeta = (x: any) =>
    isProducts ? `${x.sku || 'بدون SKU'} • ${Number(x.price || 0).toLocaleString('ar-EG')} ج.م` :
    isOrders ? `${x.customerNameSnapshot || 'عميل'} • ${formatMoney(x.total)}` :
    tab === 'categories' ? (x.slug || '') :
    tab === 'offers' ? `${x.type || ''} • ${x.stackable ? 'قابل للدمج' : 'غير قابل للدمج'} • الأولوية ${x.priority ?? 0}` :
    tab === 'settings' ? (x.value || '') : '';

  return (
    <DataWorkspace>
      <DataToolbar
        search={query}
        onSearch={setQuery}
        placeholder={`البحث في ${tab === 'products' ? 'المنتجات' : tab === 'orders' ? 'الطلبات' : 'البيانات'}...`}
      >
        <span className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          {filtered.length.toLocaleString('ar-EG')} عنصر
        </span>
      </DataToolbar>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[700px] text-right">
          <thead>
            <tr className="border-b border-border/40 bg-muted/10 text-[11px] text-muted-foreground">
              <th className="px-5 py-3 font-medium">العنصر</th>
              <th className="px-5 py-3 font-medium">التفاصيل</th>
              {isProducts && <th className="px-5 py-3 font-medium">المخزون</th>}
              {isOrders && <th className="px-5 py-3 font-medium">الحالة</th>}
              <th className="px-5 py-3 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x: any) => (
              <tr key={x.id || x.key} className="border-b border-border/30 transition hover:bg-muted/10">
                <td className="px-5 py-4">
                  <div className="font-serif text-sm font-bold text-foreground">{getTitle(x)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{x.id || x.key || ''}</div>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{getMeta(x)}</td>
                {isProducts && <td className="px-5 py-4 text-xs font-medium">{x.stock ?? 0}</td>}
                {isOrders && (
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/8 px-2.5 py-1 text-[10px] text-[var(--gold)]">
                      {x.status || '—'}
                    </span>
                  </td>
                )}
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs transition hover:bg-muted/30" onClick={() => onEdit(x)}>تعديل</button>
                    <button className="rounded-xl border border-red-400 p-2 text-red-500 transition hover:bg-red-500/10" onClick={() => onDelete(x.id)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 md:hidden">
        {filtered.map((x: any) => (
          <div key={x.id || x.key} className="rounded-2xl border border-border/40 bg-muted/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-serif text-sm font-bold text-foreground">{getTitle(x)}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{getMeta(x)}</div>
                {isProducts && <div className="mt-2 text-[11px] text-muted-foreground">المخزون: <b className="text-foreground">{x.stock ?? 0}</b></div>}
                {isOrders && (
                  <div className="mt-2">
                    <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/8 px-2.5 py-1 text-[10px] text-[var(--gold)]">{x.status || '—'}</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs" onClick={() => onEdit(x)}>تعديل</button>
                <button className="rounded-xl border border-red-400 p-2 text-red-500" onClick={() => onDelete(x.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filtered.length && (
        <div className="p-10">
          <AdminEmpty>{query ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد بيانات.'}</AdminEmpty>
        </div>
      )}
    </DataWorkspace>
  );
}

function formatMoney(value: any) {
  return `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${positive ? 'text-green-600' : 'text-red-500'}`}>
      <Icon size={12} /> {Math.abs(Number(value || 0))}%
    </span>
  );
}

function Analytics({ data: initialData }: any) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function loadRange(nextDays: number) {
    setDays(nextDays);
    setLoading(true);
    try {
      const x = await api(`/api/admin/analytics?days=${nextDays}`);
      setData(x || {});
    } catch (e: any) {
      if (typeof window !== 'undefined') window.alert(e?.message || 'تعذر تحميل التحليلات.');
    } finally {
      setLoading(false);
    }
  }

  const totals = data.totals || {};
  const comparison = data.comparison || {};
  const daily = data.daily || [];
  const maxSales = Math.max(1, ...daily.map((x: any) => Number(x.sales || 0)));
  const statusLabels: Record<string, string> = { NEW: 'جديد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي' };
  const paymentLabels: Record<string, string> = { COD: 'الدفع عند الاستلام', VODAFONE_CASH: 'فودافون كاش', INSTAPAY: 'InstaPay' };
  const peakDay = daily.reduce((best: any, item: any) => Number(item.sales || 0) > Number(best?.sales || 0) ? item : best, null);
  const totalPaymentSales = (data.payments || []).reduce((sum: number, item: any) => sum + Number(item.sales || 0), 0);
  const topPayment = (data.payments || []).reduce((best: any, item: any) => Number(item.sales || 0) > Number(best?.sales || 0) ? item : best, null);
  const deliveredOrders = (data.statuses || []).find((x: any) => x.status === 'DELIVERED')?.count || 0;
  const cancelledOrders = (data.statuses || []).find((x: any) => x.status === 'CANCELLED')?.count || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">التحليلات المتقدمة</h2>
          <p className="text-xs text-muted-foreground font-light mt-1">قراءة أداء المتجر وسلوك العملاء من الطلبات الفعلية.</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/10 border border-border/40">
          {[7, 30, 90, 365].map((x) => (
            <button key={x} onClick={() => loadRange(x)} className={`px-3 py-2 rounded-xl text-[11px] transition cursor-pointer ${days === x ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold' : 'text-muted-foreground hover:bg-muted/20'}`}>
              {x === 7 ? '7 أيام' : x === 30 ? '30 يوم' : x === 90 ? '90 يوم' : 'سنة'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground">جارٍ تحديث البيانات…</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['المبيعات', formatMoney(totals.sales), comparison.sales, 'text-[var(--gold)]'],
          ['الطلبات', totals.orders || 0, comparison.orders, 'text-foreground'],
          ['متوسط الطلب', formatMoney(totals.aov), comparison.aov, 'text-foreground'],
          ['العملاء النشطون', totals.activeCustomers || 0, comparison.activeCustomers, 'text-foreground'],
        ].map(([label, value, delta, tone]) => (
          <div key={String(label)} className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs space-y-2">
            <p className="text-muted-foreground text-xs font-light">{label}</p>
            <div className="flex items-end justify-between gap-2">
              <h3 className={`text-2xl font-serif font-bold ${tone}`}>{value}</h3>
              <Delta value={Number(delta || 0)} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-border/40 bg-muted/10 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">أفضل يوم مبيعات</span><TrendingUp size={15} className="text-[var(--gold)]" /></div>
          <div className="mt-2 flex items-end justify-between gap-3"><b className="text-sm font-serif">{peakDay?.date ? new Date(`${peakDay.date}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long' }) : '—'}</b><span className="text-xs text-muted-foreground">{peakDay ? formatMoney(peakDay.sales) : '—'}</span></div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-muted/10 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">أقوى وسيلة دفع</span><CreditCard size={15} className="text-[var(--gold)]" /></div>
          <div className="mt-2 flex items-end justify-between gap-3"><b className="text-sm font-serif">{topPayment ? (paymentLabels[topPayment.method] || topPayment.method) : '—'}</b><span className="text-xs text-muted-foreground">{topPayment && totalPaymentSales ? `${Math.round((Number(topPayment.sales || 0) / totalPaymentSales) * 100)}%` : '—'}</span></div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-muted/10 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">توزيع النتائج</span><CheckCircle2 size={15} className="text-[var(--gold)]" /></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs"><span>تم التسليم <b>{deliveredOrders}</b></span><span className="text-red-500">ملغي <b>{cancelledOrders}</b></span></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="font-serif font-bold">المبيعات اليومية</h3><p className="text-[11px] text-muted-foreground mt-1">آخر {days} يوم</p></div>
            <TrendingUp size={18} className="text-[var(--gold)]" />
          </div>
          <div className="h-48 flex items-end gap-1.5 overflow-hidden">
            {daily.map((x: any) => (
              <div key={x.date} className="flex-1 min-w-[4px] h-full flex items-end group" title={`${x.date}: ${formatMoney(x.sales)}`}>
                <div className="w-full rounded-t-md bg-[var(--gold)]/70 group-hover:bg-[var(--gold)] transition" style={{ height: `${Math.max(3, (Number(x.sales || 0) / maxSales) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4"><PieChart size={17} className="text-[var(--gold)]" /><h3 className="font-serif font-bold">طرق الدفع</h3></div>
          <div className="space-y-3">
            {(data.payments || []).map((x: any) => (
              <div key={x.method} className="space-y-1">
                <div className="flex justify-between text-xs"><span>{paymentLabels[x.method] || x.method}</span><b>{formatMoney(x.sales)}</b></div>
                <div className="h-2 rounded-full bg-muted/20 overflow-hidden"><div className="h-full bg-[var(--gold)] rounded-full" style={{ width: `${totals.sales ? Math.min(100, (x.sales / totals.sales) * 100) : 0}%` }} /></div>
              </div>
            ))}
            {!(data.payments || []).length && <p className="text-xs text-muted-foreground">لا توجد بيانات كافية.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
          <h3 className="font-serif font-bold mb-4">أفضل المنتجات</h3>
          <div className="space-y-2.5">
            {(data.topProducts || []).map((x: any, i: number) => <div key={`${x.name}-${i}`} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0"><span className="w-6 text-xs text-muted-foreground">{i + 1}</span><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{x.name}</p><p className="text-[10px] text-muted-foreground">{x.quantity} قطعة</p></div><b className="text-xs">{formatMoney(x.revenue)}</b></div>)}
            {!(data.topProducts || []).length && <p className="text-xs text-muted-foreground">لا توجد مبيعات في الفترة.</p>}
          </div>
        </div>
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
          <h3 className="font-serif font-bold mb-4">حالة الطلبات</h3>
          <div className="space-y-2.5">
            {(data.statuses || []).map((x: any) => <div key={x.status} className="flex items-center justify-between text-xs"><span>{statusLabels[x.status] || x.status}</span><span className="px-2.5 py-1 rounded-full bg-muted/20 border border-border/40">{x.count}</span></div>)}
          </div>
        </div>
      </div>

      <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h3 className="font-serif font-bold">مؤشرات العملاء</h3><p className="text-[11px] text-muted-foreground mt-1">مبنية على تاريخ الطلبات الكامل.</p></div><span className="text-xs text-muted-foreground">عملاء جدد: <b className="text-foreground">{totals.newCustomers || 0}</b></span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[['vip','VIP'],['loyal','أوفياء'],['highValue','قيمة مرتفعة'],['atRisk','معرضون للفقد']].map(([key,label]) => <div key={key} className="rounded-2xl bg-[var(--bg)] border border-border/40 p-4"><p className="text-[11px] text-muted-foreground">{label}</p><b className="text-xl font-serif">{data.segments?.[key] || 0}</b></div>)}
        </div>
      </div>
    </div>
  );
}

function CustomerSegments({ data, onRefresh }: any) {
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [audience, setAudience] = useState<any[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceMsg, setAudienceMsg] = useState('');
  const toneClass: Record<string, string> = {
    gold: 'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/20',
    green: 'text-green-600 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    violet: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
    muted: 'text-muted-foreground bg-muted/20 border-border/40',
  };

  const selectedSegmentData = (data.segments || []).find((x: any) => x.key === selectedSegment);

  async function loadAudience(key = selectedSegment) {
    setAudienceLoading(true);
    setAudienceMsg('');
    try {
      const result = await api(`/api/admin/customer-segments?segment=${encodeURIComponent(key)}`);
      const nextAudience = Array.isArray(result?.audience) ? result.audience : [];

      // Keep the table useful immediately from the segment payload as a fallback.
      // The API remains the source of truth and replaces this data when available.
      if (nextAudience.length > 0 || key === 'all') {
        setAudience(nextAudience);
      } else {
        const segment = (result?.segments || []).find((x: any) => x.key === key);
        setAudience(Array.isArray(segment?.members) ? segment.members.map((m: any) => ({
          ...m,
          segment: key,
        })) : []);
      }
    } catch (e: any) {
      const fallback = key === 'all'
        ? []
        : Array.isArray(selectedSegmentData?.members)
          ? selectedSegmentData.members.map((m: any) => ({ ...m, segment: key }))
          : [];
      setAudience(fallback);
      setAudienceMsg(e?.message || 'تعذر تحميل الجمهور المستهدف');
    } finally {
      setAudienceLoading(false);
    }
  }

  function selectSegment(key: string) {
    setSelectedSegment(key);
    setAudienceMsg('');
    loadAudience(key);
  }

  async function copyPhones() {
    const phones = audience.map((x) => x.phone).filter(Boolean);
    if (!phones.length) { setAudienceMsg('لا توجد أرقام هاتف متاحة في هذه الشريحة.'); return; }
    try {
      await navigator.clipboard.writeText(phones.join('\n'));
      setAudienceMsg(`تم نسخ ${phones.length} رقم هاتف.`);
    } catch {
      setAudienceMsg('تعذر النسخ تلقائيًا من المتصفح.');
    }
  }

  function exportAudience() {
    window.open(`/api/admin/customer-segments?segment=${encodeURIComponent(selectedSegment)}&format=csv`, '_blank');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl md:text-2xl font-serif font-bold">تقسيم العملاء</h2><p className="text-xs text-muted-foreground font-light mt-1">تقسيم تلقائي للعملاء حسب قيمة الشراء، التكرار وحداثة آخر طلب.</p></div><button onClick={onRefresh} className="px-4 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-bold cursor-pointer inline-flex items-center gap-2"><RefreshCcw size={15} /> تحديث الشرائح</button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(data.segments || []).map((segment: any) => <button type="button" key={segment.key} onClick={() => selectSegment(segment.key)} className={`w-full text-right bg-muted/10 border rounded-3xl p-5 shadow-xs transition cursor-pointer ${selectedSegment === segment.key ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md' : 'border-border/40 hover:border-[var(--gold)]/40'}`}><div className="flex items-start justify-between gap-2"><div><h3 className="font-serif font-bold text-sm">{segment.name}</h3><p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{segment.rule}</p></div><span className={`px-2 py-1 rounded-full border text-[10px] ${toneClass[segment.tone] || toneClass.muted}`}>{segment.count}</span></div><div className="mt-4 flex justify-between text-[11px] text-muted-foreground"><span>إجمالي الإنفاق</span><b className="text-foreground">{formatMoney(segment.totalSpend)}</b></div><div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>متوسط العميل</span><b className="text-foreground">{formatMoney(segment.avgSpend)}</b></div></div>)}
      </div>
      <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs"><h3 className="font-serif font-bold mb-4">أهم العملاء داخل الشرائح</h3><div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3">العميل</th><th className="p-3">الشريحة</th><th className="p-3">الطلبات</th><th className="p-3">الإنفاق</th><th className="p-3">آخر طلب</th></tr></thead><tbody>{(data.segments || []).flatMap((s: any) => (s.members || []).slice(0, 5).map((m: any) => ({ ...m, segment: s.name, id: `${s.key}-${m.id}` }))).map((m: any) => <tr key={m.id} className="border-b border-border/20 last:border-0"><td className="p-3 font-medium">{m.name}</td><td className="p-3 text-muted-foreground">{m.segment}</td><td className="p-3">{m.orderCount}</td><td className="p-3">{formatMoney(m.spend)}</td><td className="p-3 text-muted-foreground">{m.lastOrder ? new Date(m.lastOrder).toLocaleDateString('ar-EG') : '—'}</td></tr>)}</tbody></table></div></div>
      <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif font-bold">جمهور التسويق</h3>
            <p className="text-[11px] text-muted-foreground mt-1">اختر شريحة لعرض العملاء الفعليين وتجهيزها للتواصل أو التصدير.</p>
          </div>
          <span className="px-3 py-1.5 rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 text-[var(--gold)] text-[10px] font-bold">{audience.length || (selectedSegment !== 'all' ? Number(selectedSegmentData?.count || 0) : 0)} عميل</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={() => selectSegment('all')} className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${selectedSegment === 'all' ? 'bg-[var(--gold)] text-[var(--gold-contrast)] border-[var(--gold)]' : 'border-border/40 bg-muted/10'}`}>كل العملاء</button>
          {(data.segments || []).map((segment: any) => <button key={segment.key} type="button" onClick={() => selectSegment(segment.key)} className={`px-3 py-2 rounded-xl border text-xs cursor-pointer ${selectedSegment === segment.key ? 'bg-[var(--gold)] text-[var(--gold-contrast)] border-[var(--gold)]' : 'border-border/40 bg-muted/10'}`}>{segment.name} ({segment.count})</button>)}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" disabled={audienceLoading} onClick={() => loadAudience()} className="px-3 py-2 rounded-xl border border-border/40 text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"><RefreshCcw size={14} />{audienceLoading ? 'جاري التحميل...' : 'تحديث الجمهور'}</button>
          <button type="button" onClick={copyPhones} className="px-3 py-2 rounded-xl border border-border/40 text-xs inline-flex items-center gap-2 cursor-pointer"><Share2 size={14} />نسخ أرقام الهاتف</button>
          <button type="button" onClick={exportAudience} className="px-3 py-2 rounded-xl border border-border/40 text-xs inline-flex items-center gap-2 cursor-pointer"><FileText size={14} />تصدير CSV</button>
        </div>
        {audienceMsg && <p className="text-[11px] text-[var(--gold)] mb-3">{audienceMsg}</p>}
        <div className="space-y-2 md:hidden">
          {(audience.length ? audience : (selectedSegment !== 'all' && Array.isArray(selectedSegmentData?.members) ? selectedSegmentData.members : [])).slice(0, 50).map((m: any) => (
            <div key={m.id} className="rounded-2xl border border-border/30 bg-[var(--bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><b className="block truncate text-sm">{m.name}</b><span className="mt-1 block text-[11px] text-muted-foreground" dir="ltr">{m.phone || '—'}</span></div>
                <span className="shrink-0 rounded-full bg-muted/20 px-2 py-1 text-[10px]">{m.orderCount || 0} طلب</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-muted-foreground">الإنفاق</span><b className="block mt-1">{formatMoney(m.spend)}</b></div><div><span className="text-muted-foreground">آخر طلب</span><b className="block mt-1">{m.lastOrder ? new Date(m.lastOrder).toLocaleDateString('ar-EG') : '—'}</b></div></div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-border/30 md:block">
          <table className="w-full text-right text-xs">
            <thead><tr className="border-b border-border/30 text-muted-foreground"><th className="p-3">العميل</th><th className="p-3">الهاتف</th><th className="p-3">الطلبات</th><th className="p-3">الإنفاق</th><th className="p-3">آخر طلب</th></tr></thead>
            <tbody>
              {(audience.length ? audience : (selectedSegment !== 'all' && Array.isArray(selectedSegmentData?.members) ? selectedSegmentData.members : [])).slice(0, 50).map((m: any) => <tr key={m.id} className="border-b border-border/20 last:border-0"><td className="p-3 font-medium">{m.name}</td><td className="p-3" dir="ltr">{m.phone || '—'}</td><td className="p-3">{m.orderCount}</td><td className="p-3">{formatMoney(m.spend)}</td><td className="p-3 text-muted-foreground">{m.lastOrder ? new Date(m.lastOrder).toLocaleDateString('ar-EG') : '—'}</td></tr>)}
              {!audience.length && !audienceLoading && selectedSegment === 'all' && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">اختر شريحة لعرض جمهورها.</td></tr>}
            </tbody>
          </table>
        </div>
        {audience.length > 50 && <p className="text-[10px] text-muted-foreground mt-2">يتم عرض أول 50 عميلًا فقط في اللوحة. التصدير CSV يحتوي على الجمهور كاملًا.</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">{data.note || ''}</p>
    </div>
  );
}

function Customers({ data }: any) {
  return (
    <div className="space-y-2.5">
      {data.map((c: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex justify-between items-center shadow-xs" key={c.id}>
          <div>
            <b className="font-serif font-bold text-foreground">{c.name}</b>
            <p className="text-muted-foreground text-xs font-light mt-0.5">{c.phone} • {c.email || 'بدون إيميل'}</p>
          </div>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد عملاء.</div>}
    </div>
  );
}

function Orders({ data, onRefresh }: any) {
  return (
    <div className="space-y-2.5">
      {data.map((o: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex justify-between items-center shadow-xs" key={o.id}>
          <div>
            <Link href={`/admin/orders/${o.id}`} className="text-[var(--gold)] font-serif font-bold hover:underline inline-block text-base cursor-pointer">
              طلب #{o.number} 🔗
            </Link>
            <p className="text-muted-foreground text-xs font-light mt-1">
              {o.customerNameSnapshot || 'عميل'} • {o.total} ج.م • <span className="text-[var(--gold)] font-medium">{o.status}</span>
            </p>
          </div>
          <Link href={`/admin/orders/${o.id}`} className="px-4 py-2 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold hover:opacity-95 transition shadow-xs cursor-pointer">
            إدارة الطلب ←
          </Link>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد طلبات.</div>}
    </div>
  );
}

function Sortable({ data, onEdit, onDelete, onReorder }: any) {
  const [items, setItems] = useState(data);
  useEffect(() => setItems(data), [data]);
  const [drag, setDrag] = useState<number | null>(null);
  
  return (
    <div className="space-y-2.5">
      {items.map((x: any, i: number) => (
        <div key={x.id} draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={async () => { if (drag === null || drag === i) return; const a = [...items]; const [m] = a.splice(drag, 1); a.splice(i, 0, m); setDrag(null); await onReorder(a, '/api/admin/homepage'); }} className="bg-muted/10 border border-border/40 rounded-2xl flex items-center gap-3 p-4 cursor-move shadow-xs">
          <GripVertical className="text-muted-foreground" />
          <div className="flex-1">
            <b className="font-serif font-bold text-foreground text-sm">{x.title || x.type}</b>
            <p className="text-muted-foreground text-xs font-light mt-0.5">{x.visible ? 'ظاهر' : 'مخفي'} • ترتيب {i + 1}</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(x)}>تعديل</button>
          <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(x.id)}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function Media({ data, onDelete, onRefresh }: any) {
  const [busy, setBusy] = useState(false);
  async function upload(f: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      await api('/api/admin/media', 'POST', fd);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="px-5 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-xs shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer">
        <Upload size={17} /> {busy ? 'جارٍ الرفع…' : 'رفع صورة'}
        <input hidden type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.map((x: any) => (
          <div key={x.id} className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden shadow-xs">
            <Image src={x.url} width={600} height={600} alt={x.name || "صورة من مكتبة الوسائط"} sizes="(max-width: 768px) 50vw, 25vw" className="aspect-square w-full object-cover" />
            <div className="p-3.5 space-y-2">
              <p className="truncate text-xs text-foreground font-light">{x.name}</p>
              <button className="w-full py-2 rounded-xl border border-red-400 text-red-500 text-xs font-medium hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(x.id)}>حذف</button>
            </div>
          </div>
        ))}
        {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl col-span-full p-12 text-center text-muted-foreground text-sm font-light">لا توجد وسائط.</div>}
      </div>
    </div>
  );
}

function Reviews({ data, onRefresh }: any) {
  return (
    <div className="space-y-2.5">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-xs" key={x.id}>
          <div className="flex-1 space-y-1">
            <b className="font-serif font-bold text-foreground text-sm">{x.customer?.name || 'عميل'} — {x.product?.name}</b>
            <p className="text-xs text-foreground font-light">{'★'.repeat(x.rating)} <span className="text-muted-foreground">{x.text || ''}</span></p>
          </div>
          <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.approved ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/reviews', 'PUT', { id: x.id, approved: !x.approved }); onRefresh(); }}>
            {x.approved ? 'معتمد' : 'معلق'}
          </button>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد مراجعات.</div>}
    </div>
  );
}
