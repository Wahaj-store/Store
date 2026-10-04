// مسار الملف: components/AdminManager.tsx

'use client';
import { useEffect, useState, ComponentType } from 'react';
import Link from 'next/link';
import { 
  GripVertical, Trash2, Upload, Plus, Save, Image as ImageIcon, Search, ChevronLeft,
  Package, FolderTree, Tag, CreditCard, Truck, LayoutTemplate, 
  MessageSquareQuote, Users, Shield, ShoppingCart, BarChart3, Sliders, 
  FileText, HelpCircle, Mail, Settings, Gift, RefreshCcw, Share2, Lock, LucideProps, Menu, X, TrendingUp, TrendingDown, PieChart
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

  const getCurrentTabLabel = () => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item[0] === tab);
      if (found) return found[1];
    }
    return '';
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-5 lg:grid-cols-[290px_1fr] items-start relative">
        
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        <aside className={`
          fixed lg:sticky top-0 lg:top-6 bottom-0 right-0 z-50 w-[290px] lg:w-auto
          bg-[var(--bg)] lg:bg-muted/10 border border-border/40 rounded-[28px] p-4
          space-y-5 shadow-2xl lg:shadow-xs max-h-screen lg:max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="rounded-[22px] border border-border/40 bg-muted/10 px-4 py-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-[var(--bg)] p-1.5">
                  <Image src="/images/wahaj.logo.png" alt="Wahaj Store" fill sizes="48px" className="object-contain" priority />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-serif font-bold text-foreground">Wahaj Store</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">لوحة التحكم والإدارة</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden shrink-0 p-2 rounded-xl bg-muted/20 text-muted-foreground hover:text-foreground cursor-pointer" aria-label="إغلاق القائمة">
                <X size={17} />
              </button>
            </div>
          </div>

          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-serif font-bold uppercase tracking-wider text-[var(--gold)]/90">
                {group.title}
              </h3>
              <div className="space-y-1 pt-1">
                {group.items.map((item) => {
                  const k = item[0];
                  const t = item[1];
                  const Icon = item[2];
                  return (
                    <button 
                      key={k} 
                      onClick={() => { setTab(k); setEditing(null); setMsg(''); setSidebarOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs md:text-sm transition-all cursor-pointer ${
                        tab === k 
                          ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 font-light'
                      }`}
                    >
                      <Icon size={16} className={tab === k ? 'text-[var(--gold-contrast)]' : 'text-[var(--gold)]'} />
                      <span className="flex-1 text-start">{t}</span>
                      {tab === k && <ChevronLeft size={14} className="text-[var(--gold-contrast)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <section className="space-y-5 min-w-0">
          <div className="rounded-[28px] border border-border/40 bg-muted/10 px-5 py-4 md:px-6 md:py-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Wahaj Store Admin</span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-foreground">{getCurrentTabLabel()}</h2>
                <p className="text-muted-foreground text-xs md:text-sm mt-0.5 font-light">إدارة كاملة لبيانات المتجر والتحكم المباشر.</p>
              </div>
            {!editing && ['products', 'categories', 'offers', 'shipping', 'homepage', 'gift-cards', 'relations', 'faq', 'redirects', 'settings'].includes(tab) && (
              <button 
                className="px-5 py-2.5 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-xs md:text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" 
                onClick={() => setEditing(getNewItemTemplate())}
              >
                <Plus size={17} /> إضافة جديدة
              </button>
            )}
            </div>
          </div>

          {msg && <div className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 text-xs md:text-sm font-medium text-[var(--gold)] shadow-xs">{msg}</div>}

          {loading ? (
            <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">جارٍ التحميل…</div>
          ) : editing ? (
            <Editor tab={tab} value={editing} cats={cats} products={products} onCancel={() => setEditing(null)} onSave={save} upload={upload} />
          ) : (
            <Content tab={tab} data={data} onEdit={setEditing} onDelete={del} onRefresh={load} onReorder={reorder} />
          )}
        </section>
      </div>
    </div>
  );
}

function Editor({ tab, value, cats, products, onCancel, onSave, upload }: any) {
  const [v, setV] = useState({ 
    ...value, 
    images: value.images || [], 
    variants: value.variants || [] 
  });

  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x }));
  const addVar = () => set('variants', [...v.variants, { name: 'اللون', value: '', stock: 0, price: '' }]);

  if (tab === 'settings') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <h3 className="font-serif font-bold text-lg text-[var(--gold)]">إعدادات المتجر العامة</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المفتاح (Key)" value={v.key || ''} onChange={(x: any) => set('key', x)} />
        <Field label="القيمة (Value)" value={v.value || ''} onChange={(x: any) => set('value', x)} />
      </div>
      <div className="flex gap-3 pt-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ الإعداد</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'faq') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
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
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'payments') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
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
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'gift-cards') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
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
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
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
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'redirects') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المسار القديم" value={v.fromPath || ''} onChange={(x: any) => set('fromPath', x)} />
        <Field label="المسار الجديد" value={v.toPath || ''} onChange={(x: any) => set('toPath', x)} />
        <Field label="كود التحويل" value={v.statusCode || 301} onChange={(x: any) => set('statusCode', x)} type="number" />
      </div>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
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
        <button className="px-6 py-3 rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
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

function Content({ tab, data, onEdit, onDelete, onRefresh, onReorder }: any) {
  if (tab === 'analytics') return <Analytics data={data[0] || {}} />;
  if (tab === 'customer-segments') return <CustomerSegments data={data[0] || {}} onRefresh={onRefresh} />;
  if (tab === 'media') return <Media data={data} onDelete={onDelete} onRefresh={onRefresh} />;
  if (tab === 'gift-cards') return (
    <div className="space-y-4">
      {data.map((card: any) => {
        const expired = card.expiresAt && new Date(card.expiresAt) <= new Date();
        const usable = card.active && !expired && Number(card.balance) > 0;
        return (
          <div key={card.id} className="bg-muted/10 border border-border/40 rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-mono text-sm md:text-base tracking-wider" dir="ltr">{card.code}</b>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] border ${usable ? 'text-green-600 border-green-500/20 bg-green-500/10' : 'text-muted-foreground border-border/40 bg-muted/20'}`}>{usable ? 'صالحة' : expired ? 'منتهية' : card.active ? 'بدون رصيد' : 'موقوفة'}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>القيمة: <b className="text-foreground">{Number(card.amount).toLocaleString('ar-EG')} ج.م</b></span>
                  <span>الرصيد: <b className="text-[var(--gold)]">{Number(card.balance).toLocaleString('ar-EG')} ج.م</b></span>
                  <span>الحركات: {card._count?.ledger ?? 0}</span>
                  {card.expiresAt && <span>الانتهاء: {new Date(card.expiresAt).toLocaleDateString('ar-EG')}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(card)}>تعديل</button>
                <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(card.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        );
      })}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد بطاقات هدايا حتى الآن.</div>}
    </div>
  );
  

  if (tab === 'faq') return (
    <div className="space-y-4">
      {data.map((faq: any) => (
        <div key={faq.id} className="bg-muted/10 border border-border/40 rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <b className="text-base font-serif font-bold text-foreground">{faq.question}</b>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-light">
                <span className="px-2.5 py-0.5 rounded-full bg-muted/20 border border-border/40">{faq.category}</span>
                <span>•</span>
                <span>الترتيب: {faq.displayOrder}</span>
                <span>•</span>
                <span className={faq.published ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                  {faq.published ? 'منشور' : 'مخفي'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(faq)}>تعديل</button>
              <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(faq.id)}><Trash2 size={16} /></button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground/90 bg-[var(--bg)]/60 border border-border/40 p-4 rounded-2xl font-light leading-relaxed">
            {faq.answer}
          </p>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد أسئلة شائعة مضافة حتى الآن.</div>}
    </div>
  );

  if (tab === 'contact') return (
    <div className="space-y-4">
      {data.map((msg: any) => (
        <div key={msg.id} className="bg-muted/10 border border-border/40 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap justify-between items-start gap-4 border-b border-border/30 pb-4">
            <div className="space-y-1">
              <b className="text-base font-serif font-bold text-foreground">{msg.name}</b>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-light">
                <span dir="ltr">📞 {msg.phone}</span>
                <span>•</span>
                <span>{new Date(msg.createdAt).toLocaleString('ar-EG')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs bg-[var(--gold)]/10 text-[var(--gold)] font-medium border border-[var(--gold)]/20">
                {msg.subject || 'استفسار عام'}
              </span>
              <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(msg.id)} title="حذف الرسالة"><Trash2 size={16} /></button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-foreground/90 bg-[var(--bg)]/60 border border-border/40 p-4 rounded-2xl leading-relaxed whitespace-pre-wrap font-light">
            {msg.message}
          </p>
          <div className="flex justify-end">
            <a href={`https://wa.me/${msg.phone}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-xl bg-[var(--gold)] text-[var(--gold-contrast)] text-xs font-serif font-bold shadow-sm hover:opacity-95 transition inline-flex items-center gap-1.5 cursor-pointer">
              الرد عبر واتساب مباشرة
            </a>
          </div>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد رسائل واردة حتى الآن.</div>}
    </div>
  );

  if (tab === 'payments') return (
    <div className="grid gap-3.5">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs space-y-3" key={x.method}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <b className="font-serif font-bold text-foreground">{x.label}</b>
              <p className="text-muted-foreground text-xs font-light mt-0.5">{x.description}</p>
            </div>
            <div className="flex gap-2.5">
              <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.enabled ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/payments', 'PUT', { ...x, enabled: !x.enabled }); onRefresh(); }}>
                {x.enabled ? 'مفعل' : 'متوقف'}
              </button>
              <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(x)}>إدارة</button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-light pt-2 border-t border-border/30">
            {x.accountNumber || 'لم يتم ضبط الحساب'} {x.proofRequired ? '• إثبات الدفع مطلوب' : ''}
          </p>
        </div>
      ))}
    </div>
  );

  if (tab === 'features') return (
    <div className="grid gap-3.5">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-5 flex items-center justify-between shadow-xs" key={x.id}>
          <div>
            <b className="font-serif font-bold text-foreground">{x.key}</b>
            <p className="text-muted-foreground text-xs font-light mt-0.5">{x.description || 'ميزة قابلة للتفعيل'}</p>
          </div>
          <button className={`px-5 py-2.5 rounded-2xl text-xs font-medium transition cursor-pointer ${x.enabled ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/features', 'PUT', { key: x.key, enabled: !x.enabled }); onRefresh(); }}>
            {x.enabled ? 'مفعل' : 'متوقف'}
          </button>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد مزايا متاحة.</div>}
    </div>
  );

  if (tab === 'security') return (
    <div className="space-y-2.5">
      {(data[0]?.logs || data || []).map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 shadow-xs" key={x.id || Math.random()}>
          <b className="font-serif font-bold text-sm text-foreground">{x.action || 'سجل نشاط'}</b>
          <span className="text-muted-foreground text-xs mr-3 font-light">{x.entity || ''}</span>
          <div className="text-muted-foreground text-[11px] mt-1 font-light">{x.createdAt ? new Date(x.createdAt).toLocaleString('ar-EG') : ''}</div>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد سجلات أمان متاحة.</div>}
    </div>
  );

  if (tab === 'reviews') return <Reviews data={data} onRefresh={onRefresh} />;
  if (tab === 'customers') return <Customers data={data} />;
  
  if (tab === 'users') return (
    <div className="space-y-3">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-xs" key={x.id}>
          <div className="flex-1">
            <b className="font-serif font-bold text-foreground">{x.name || x.email}</b>
            <p className="text-muted-foreground text-xs font-light mt-0.5">{x.email}</p>
          </div>
          <select className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60 text-xs text-foreground focus:outline-none focus:border-[var(--gold)]" value={x.role} onChange={async e => { await api('/api/admin/users', 'PUT', { id: x.id, role: e.target.value, active: x.active }); onRefresh(); }}>
            {['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER'].map(r => <option key={r}>{r}</option>)}
          </select>
          <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.active ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/users', 'PUT', { id: x.id, role: x.role, active: !x.active }); onRefresh(); }}>
            {x.active ? 'نشط' : 'موقوف'}
          </button>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد مستخدمون.</div>}
    </div>
  );

  if (tab === 'orders') return <Orders data={data} onRefresh={onRefresh} />;
  if (tab === 'homepage') return <Sortable data={data} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} />;

  if (tab === 'offers') return (
    <div className="grid gap-4">
      {data.map((offer: any) => {
        const state = getOfferState(offer);
        return (
          <div key={offer.id} className="bg-muted/10 border border-border/40 rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-serif font-bold text-foreground text-base">{offer.name}</b>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] border ${offerStateClass(state.tone)}`}>{state.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{offer.type}</span>
                  <span>الأولوية {offer.priority ?? 0}</span>
                  <span>الاستخدام {offer.usedCount ?? 0}{offer.maxUses != null ? `/${offer.maxUses}` : ''}</span>
                  <span>{Array.isArray(offer.segmentKeys) && offer.segmentKeys.length ? `الجمهور: ${offer.segmentKeys.map((key: string) => OFFER_SEGMENTS.find(x => x[0] === key)?.[1] || key).join('، ')}` : 'الجمهور: كل العملاء'}</span>
                  {offer.startsAt && <span>يبدأ {new Date(offer.startsAt).toLocaleString('ar-EG')}</span>}
                  {offer.endsAt && <span>ينتهي {new Date(offer.endsAt).toLocaleString('ar-EG')}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${offer.active ? 'bg-muted/20 border border-border/60 text-muted-foreground hover:bg-muted/30' : 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold hover:opacity-95'}`} onClick={() => toggleOfferActive(offer, onRefresh)}>
                  {offer.active ? 'إيقاف العرض' : 'تفعيل العرض'}
                </button>
                <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(offer)}>تعديل</button>
                <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(offer.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        );
      })}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد عروض حتى الآن.</div>}
    </div>
  );
  
  return (
    <div className="space-y-3">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs" key={x.id || x.key}>
          <div>
            <b className="font-serif font-bold text-foreground text-sm">{x.name || x.title || x.code || x.governorate || x.type || x.key}</b>
            <p className="text-muted-foreground text-xs font-light mt-1">
              {tab === 'products' ? `${x.sku || ''} • ${Number(x.price || 0).toLocaleString('ar-EG')} ج.م • مخزون ${x.stock}` : tab === 'categories' ? x.slug : tab === 'offers' ? `${x.type} • ${x.stackable ? 'قابل للدمج' : 'غير قابل للدمج'} • الأولوية ${x.priority ?? 0} • الاستخدام ${x.usedCount ?? 0}${x.maxUses != null ? `/${x.maxUses}` : ''}` : tab === 'settings' ? x.value : ''}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={() => onEdit(x)}>تعديل</button>
            <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(x.id)}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد بيانات.</div>}
    </div>
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
        {(data.segments || []).map((segment: any) => <div key={segment.key} className="bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-xs"><div className="flex items-start justify-between gap-2"><div><h3 className="font-serif font-bold text-sm">{segment.name}</h3><p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{segment.rule}</p></div><span className={`px-2 py-1 rounded-full border text-[10px] ${toneClass[segment.tone] || toneClass.muted}`}>{segment.count}</span></div><div className="mt-4 flex justify-between text-[11px] text-muted-foreground"><span>إجمالي الإنفاق</span><b className="text-foreground">{formatMoney(segment.totalSpend)}</b></div><div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>متوسط العميل</span><b className="text-foreground">{formatMoney(segment.avgSpend)}</b></div></div>)}
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
        <div className="overflow-x-auto rounded-2xl border border-border/30">
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
