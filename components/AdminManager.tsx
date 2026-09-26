// مسار الملف: components/AdminManager.tsx

'use client';
import { useEffect, useState, ComponentType } from 'react';
import Link from 'next/link';
import { 
  GripVertical, Trash2, Upload, Plus, Save, Image as ImageIcon, Search, ChevronLeft,
  Package, FolderTree, Tag, Ticket, CreditCard, Truck, LayoutTemplate, 
  MessageSquareQuote, Users, Shield, ShoppingCart, BarChart3, Sliders, 
  FileText, HelpCircle, Mail, Settings, Gift, RefreshCcw, Share2, Lock, LucideProps, Menu, X
} from 'lucide-react';
import MediaPicker from './MediaPicker';

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
    ]
  },
  {
    title: 'المحتوى والعروض',
    items: [
      ['homepage', 'Homepage Builder', LayoutTemplate],
      ['offers', 'العروض', Tag],
      ['coupons', 'الكوبونات', Ticket],
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

async function api(url: string, method = 'GET', body?: any) {
  const r = await fetch(url, { 
    method, 
    headers: body instanceof FormData ? undefined : body ? { 'Content-Type': 'application/json' } : undefined, 
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined 
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'حدث خطأ في النظام');
  return j;
}

export default function AdminManager({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) {
  const [tab, setTab] = useState('products');
  const [data, setData] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
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
        coupons: '/api/admin/coupons',
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
      setData(Array.isArray(x) ? x : [x]);
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
      } else if (tab === 'categories') {
        endpoint = v.id ? `/api/admin/categories` : '/api/admin/categories';
      }

      await api(endpoint, method, v);
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
      case 'offers': return { name: '', type: 'FLASH_SALE', discountValue: 0, startsAt: '', endsAt: '' };
      case 'coupons': return { code: '', value: 0, type: 'PERCENTAGE', minOrder: 0, maxUses: 100 };
      case 'gift-cards': return { code: '', amount: 0, expiresAt: '' };
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
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] items-start relative">
        
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        <aside className={`
          fixed lg:sticky top-0 lg:top-8 bottom-0 right-0 z-50 w-72 lg:w-auto
          bg-[var(--bg)] lg:bg-muted/10 border border-border/40 rounded-3xl p-4 
          space-y-6 shadow-xl lg:shadow-xs max-h-screen lg:max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-border/30">
            <span className="font-serif font-bold text-sm text-[#D4AF37]">قائمة التحكم</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl bg-muted/20 text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-serif font-bold uppercase tracking-wider text-[#D4AF37]/90">
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
                          ? 'bg-[#D4AF37] text-black font-bold shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 font-light'
                      }`}
                    >
                      <Icon size={16} className={tab === k ? 'text-black' : 'text-[#D4AF37]'} />
                      <span className="flex-1 text-start">{t}</span>
                      {tab === k && <ChevronLeft size={14} className="text-black" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <section className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-5">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">{getCurrentTabLabel()}</h2>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5 font-light">إدارة كاملة لبيانات المتجر والتحكم المباشر.</p>
            </div>
            {!editing && ['products', 'categories', 'offers', 'coupons', 'shipping', 'homepage', 'gift-cards', 'relations', 'faq', 'redirects', 'settings'].includes(tab) && (
              <button 
                className="px-5 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-xs md:text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" 
                onClick={() => setEditing(getNewItemTemplate())}
              >
                <Plus size={17} /> إضافة جديدة
              </button>
            )}
          </div>

          {msg && <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 text-xs md:text-sm font-medium text-[#D4AF37] shadow-xs">{msg}</div>}

          {loading ? (
            <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">جارٍ التحميل…</div>
          ) : editing ? (
            <Editor tab={tab} value={editing} cats={cats} onCancel={() => setEditing(null)} onSave={save} upload={upload} />
          ) : (
            <Content tab={tab} data={data} onEdit={setEditing} onDelete={del} onRefresh={load} onReorder={reorder} />
          )}
        </section>
      </div>
    </div>
  );
}

function Editor({ tab, value, cats, onCancel, onSave, upload }: any) {
  const [v, setV] = useState({ 
    ...value, 
    images: value.images || [], 
    variants: value.variants || [] 
  });

  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x }));
  const addVar = () => set('variants', [...v.variants, { name: 'اللون', value: '', stock: 0, price: '' }]);

  if (tab === 'settings') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <h3 className="font-serif font-bold text-lg text-[#D4AF37]">إعدادات المتجر العامة</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المفتاح (Key)" value={v.key || ''} onChange={(x: any) => set('key', x)} />
        <Field label="القيمة (Value)" value={v.value || ''} onChange={(x: any) => set('value', x)} />
      </div>
      <div className="flex gap-3 pt-3">
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ الإعداد</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  if (tab === 'faq') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <h3 className="font-serif font-bold text-lg text-[#D4AF37]">{v.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="السؤال" value={v.question || ''} onChange={(x: any) => set('question', x)} />
        <label className="text-xs md:text-sm font-medium text-muted-foreground">القسم
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37]" value={v.category || 'general'} onChange={e => set('category', e.target.value)}>
            <option value="general">عام</option>
            <option value="shipping">الشحن والتوصيل</option>
            <option value="payment">الدفع</option>
            <option value="returns">الاستبدال والاسترجاع</option>
            <option value="products">المنتجات</option>
          </select>
        </label>
        <Field label="ترتيب الظهور" type="number" value={v.displayOrder ?? 0} onChange={(x: any) => set('displayOrder', Number(x))} />
        <label className="flex items-center gap-2.5 pt-6 text-sm font-light cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#D4AF37]" checked={!!v.published} onChange={e => set('published', e.target.checked)} /> منشور في المتجر
        </label>
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الإجابة
          <textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37] min-h-28" value={v.answer || ''} onChange={e => set('answer', e.target.value)} />
        </label>
      </div>
      <div className="flex gap-3 pt-3">
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
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
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الوصف<textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37]" value={v.description || ''} onChange={e => set('description', e.target.value)} /></label>
        <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">تعليمات الدفع<textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37] min-h-28" value={v.instructions || ''} onChange={e => set('instructions', e.target.value)} /></label>
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[#D4AF37]" checked={!!v.enabled} onChange={e => set('enabled', e.target.checked)} /> مفعلة</label>
        <label className="flex items-center gap-2.5 text-sm font-light cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[#D4AF37]" checked={!!v.proofRequired} onChange={e => set('proofRequired', e.target.checked)} /> طلب إثبات دفع</label>
      </div>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );

  const common: any = { 
    relations: [['type', 'نوع العلاقة'], ['fromProductId', 'المنتج الأساسي'], ['toProductId', 'المنتج المقترح'], ['sortOrder', 'الترتيب']], 
    'gift-cards': [['code', 'كود البطاقة'], ['amount', 'القيمة'], ['expiresAt', 'تاريخ الانتهاء']], 
    categories: [['name', 'اسم التصنيف'], ['slug', 'Slug'], ['description', 'الوصف'], ['sortOrder', 'الترتيب']], 
    offers: [['name', 'اسم العرض'], ['type', 'نوع العرض'], ['discountValue', 'قيمة الخصم'], ['startsAt', 'يبدأ'], ['endsAt', 'ينتهي']], 
    coupons: [['code', 'الكود'], ['value', 'قيمة الخصم'], ['minOrder', 'الحد الأدنى'], ['maxUses', 'عدد الاستخدامات']], 
    shipping: [['governorate', 'المحافظة'], ['city', 'المدينة'], ['price', 'سعر الشحن'], ['freeAbove', 'مجاني فوق']], 
    homepage: [['type', 'نوع القسم'], ['title', 'العنوان'], ['subtitle', 'الوصف'], ['ctaText', 'نص الزر'], ['ctaUrl', 'رابط الزر'], ['sortOrder', 'الترتيب']], 
    redirects: [['fromPath', 'المسار القديم'], ['toPath', 'المسار الجديد'], ['statusCode', 'كود التحويل']] 
  };

  if (tab === 'offers') return (
    <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="اسم العرض" value={v.name || ''} onChange={(x: any) => set('name', x)} />
        <label className="text-xs md:text-sm font-medium text-muted-foreground">نوع العرض
          <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37]" value={v.type || 'FLASH_SALE'} onChange={e => set('type', e.target.value)}>
            {['FLASH_SALE', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'FIRST_ORDER', 'SEASONAL'].map((x: any) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <Field label="قيمة الخصم" value={v.discountValue || ''} onChange={(x: any) => set('discountValue', x)} type="number" />
        <Field label="يبدأ" value={v.startsAt || ''} onChange={(x: any) => set('startsAt', x)} />
        <Field label="ينتهي" value={v.endsAt || ''} onChange={(x: any) => set('endsAt', x)} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
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
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
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
              <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37]" value={v.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">اختر التصنيف</option>
                {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-xs md:text-sm font-medium text-muted-foreground">الحالة
              <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37]" value={v.status} onChange={e => set('status', e.target.value)}>
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
                  <input type="checkbox" className="w-4 h-4 accent-[#D4AF37]" checked={!!v[k]} onChange={e => set(k, e.target.checked)} />{l}
                </label>
              ))}
            </div>
            <label className="md:col-span-2 text-xs md:text-sm font-medium text-muted-foreground">الوصف
              <textarea className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37] min-h-28" value={v.description || ''} onChange={e => set('description', e.target.value)} />
            </label>
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-serif font-bold text-[#D4AF37]">صور المنتج</p>
              <div className="flex flex-wrap gap-3">
                {v.images.map((im: any, i: number) => (
                  <div key={i} className="relative">
                    <img src={im.url} className="h-24 w-24 rounded-2xl object-cover border border-border/60 shadow-xs" />
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
                <b className="font-serif font-bold text-sm text-[#D4AF37]">Variants / الخيارات</b>
                <button className="px-4 py-2 rounded-xl bg-muted/20 border border-border/60 text-xs font-medium hover:bg-muted/30 transition cursor-pointer" onClick={addVar}>+ إضافة خيار</button>
              </div>
              {v.variants.map((x: any, i: number) => (
                <div className="grid gap-2.5 md:grid-cols-5 items-center p-3 rounded-2xl bg-[var(--bg)] border border-border/60 shadow-xs" key={i}>
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" placeholder="النوع" value={x.name} onChange={e => { const a = [...v.variants]; a[i].name = e.target.value; set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" placeholder="القيمة" value={x.value} onChange={e => { const a = [...v.variants]; a[i].value = e.target.value; set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" type="number" placeholder="المخزون" value={x.stock} onChange={e => { const a = [...v.variants]; a[i].stock = Number(e.target.value); set('variants', a); }} />
                  <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" type="number" placeholder="سعر خاص" value={x.price ?? ""} onChange={e => { const a = [...v.variants]; a[i].price = e.target.value === '' ? null : Number(e.target.value); set('variants', a); }} />
                  <div className="flex gap-2">
                    <input className="w-full px-3 py-2 rounded-xl bg-muted/10 border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" placeholder="SKU" value={x.sku || ""} onChange={e => { const a = [...v.variants]; a[i].sku = e.target.value; set('variants', a); }} />
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
        <button className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => onSave(v)}><Save size={17} /> حفظ</button>
        <button className="px-5 py-3 rounded-2xl bg-muted/20 border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted/30 transition cursor-pointer" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: any) {
  return (
    <label className="text-xs md:text-sm font-medium text-muted-foreground space-y-1 block">
      {label}
      <input className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37] transition shadow-xs" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }: any) {
  return (
    <label className="mt-4 block text-xs md:text-sm font-medium text-muted-foreground space-y-1">
      {label}
      <select className="w-full mt-1 px-4 py-3 rounded-2xl bg-[var(--bg)] border border-border/60 text-foreground text-sm focus:outline-none focus:border-[#D4AF37] transition shadow-xs" value={value} onChange={e => onChange(e.target.value)}>
        {options.map((x: string) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );
}

function Content({ tab, data, onEdit, onDelete, onRefresh, onReorder }: any) {
  if (tab === 'analytics') return <Analytics data={data[0] || {}} />;
  if (tab === 'media') return <Media data={data} onDelete={onDelete} onRefresh={onRefresh} />;
  
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
              <span className="px-3 py-1 rounded-full text-xs bg-[#D4AF37]/10 text-[#D4AF37] font-medium border border-[#D4AF37]/20">
                {msg.subject || 'استفسار عام'}
              </span>
              <button className="p-2 rounded-xl border border-red-400 text-red-500 hover:bg-red-500/10 transition cursor-pointer" onClick={() => onDelete(msg.id)} title="حذف الرسالة"><Trash2 size={16} /></button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-foreground/90 bg-[var(--bg)]/60 border border-border/40 p-4 rounded-2xl leading-relaxed whitespace-pre-wrap font-light">
            {msg.message}
          </p>
          <div className="flex justify-end">
            <a href={`https://wa.me/${msg.phone}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black text-xs font-serif font-bold shadow-sm hover:opacity-95 transition inline-flex items-center gap-1.5 cursor-pointer">
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
              <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.enabled ? 'bg-[#D4AF37] text-black font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/payments', 'PUT', { ...x, enabled: !x.enabled }); onRefresh(); }}>
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
          <button className={`px-5 py-2.5 rounded-2xl text-xs font-medium transition cursor-pointer ${x.enabled ? 'bg-[#D4AF37] text-black font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/features', 'PUT', { key: x.key, enabled: !x.enabled }); onRefresh(); }}>
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
          <select className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-border/60 text-xs text-foreground focus:outline-none focus:border-[#D4AF37]" value={x.role} onChange={async e => { await api('/api/admin/users', 'PUT', { id: x.id, role: e.target.value, active: x.active }); onRefresh(); }}>
            {['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER'].map(r => <option key={r}>{r}</option>)}
          </select>
          <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.active ? 'bg-[#D4AF37] text-black font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/users', 'PUT', { id: x.id, role: x.role, active: !x.active }); onRefresh(); }}>
            {x.active ? 'نشط' : 'موقوف'}
          </button>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد مستخدمون.</div>}
    </div>
  );

  if (tab === 'orders') return <Orders data={data} onRefresh={onRefresh} />;
  if (tab === 'homepage') return <Sortable data={data} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} />;
  
  return (
    <div className="space-y-3">
      {data.map((x: any) => (
        <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs" key={x.id}>
          <div>
            <b className="font-serif font-bold text-foreground text-sm">{x.name || x.title || x.code || x.governorate || x.type}</b>
            <p className="text-muted-foreground text-xs font-light mt-1">
              {tab === 'products' ? `${x.sku || ''} • ${Number(x.price || 0).toLocaleString('ar-EG')} ج.م • مخزون ${x.stock}` : tab === 'categories' ? x.slug : tab === 'coupons' ? `${x.type} • ${x.value}` : ''}
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

function Analytics({ data }: any) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 shadow-xs space-y-1">
        <p className="text-muted-foreground text-xs font-light">إجمالي المبيعات</p>
        <h3 className="text-2xl font-serif font-bold text-[#D4AF37]">{data.totalSales || 0} ج.م</h3>
      </div>
      <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 shadow-xs space-y-1">
        <p className="text-muted-foreground text-xs font-light">إجمالي الطلبات</p>
        <h3 className="text-2xl font-serif font-bold text-foreground">{data.totalOrders || 0}</h3>
      </div>
      <div className="bg-muted/10 border border-border/40 rounded-3xl p-6 shadow-xs space-y-1">
        <p className="text-muted-foreground text-xs font-light">إجمالي العملاء</p>
        <h3 className="text-2xl font-serif font-bold text-foreground">{data.totalCustomers || 0}</h3>
      </div>
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
            <Link href={`/admin/orders/${o.id}`} className="text-[#D4AF37] font-serif font-bold hover:underline inline-block text-base cursor-pointer">
              طلب #{o.number} 🔗
            </Link>
            <p className="text-muted-foreground text-xs font-light mt-1">
              {o.customerNameSnapshot || 'عميل'} • {o.total} ج.م • <span className="text-[#D4AF37] font-medium">{o.status}</span>
            </p>
          </div>
          <Link href={`/admin/orders/${o.id}`} className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-serif font-bold hover:opacity-95 transition shadow-xs cursor-pointer">
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
      <label className="px-5 py-3 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-xs shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer">
        <Upload size={17} /> {busy ? 'جارٍ الرفع…' : 'رفع صورة'}
        <input hidden type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.map((x: any) => (
          <div key={x.id} className="bg-muted/10 border border-border/40 rounded-3xl overflow-hidden shadow-xs">
            <img src={x.url} className="aspect-square w-full object-cover" />
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
          <button className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${x.approved ? 'bg-[#D4AF37] text-black font-bold shadow-xs' : 'bg-muted/20 border border-border/60 text-muted-foreground'}`} onClick={async () => { await api('/api/admin/reviews', 'PUT', { id: x.id, approved: !x.approved }); onRefresh(); }}>
            {x.approved ? 'معتمد' : 'معلق'}
          </button>
        </div>
      ))}
      {!data.length && <div className="bg-muted/10 border border-border/40 rounded-3xl p-12 text-center text-muted-foreground text-sm font-light">لا توجد مراجعات.</div>}
    </div>
  );
}
