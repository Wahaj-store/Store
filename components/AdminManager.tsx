// مسار الملف: components/AdminManager.tsx

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  GripVertical, Trash2, Upload, Plus, Save, Image as ImageIcon, Search, ChevronLeft,
  Package, FolderTree, Tag, Ticket, CreditCard, Truck, LayoutTemplate, 
  MessageSquareQuote, Users, Shield, ShoppingCart, BarChart3, Sliders, 
  FileText, HelpCircle, Mail, Settings, Gift, RefreshCcw, Share2, Lock
} from 'lucide-react';
import MediaPicker from './MediaPicker';

// تقسيم القائمة إلى مجموعات احترافية ومنظمة
const menuGroups = [
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

const emptyProduct: any = { name: '', slug: '', description: '', price: '', comparePrice: '', stock: 0, sku: '', categoryId: '', status: 'DRAFT', material: '', careInstructions: '', seoTitle: '', seoDescription: '', images: [], variants: [] };

async function api(url: string, method = 'GET', body?: any) {
  const r = await fetch(url, { method, headers: body instanceof FormData ? undefined : body ? { 'Content-Type': 'application/json' } : undefined, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'حدث خطأ');
  return j;
}

export default function AdminManager() {
  const [tab, setTab] = useState('products');
  const [data, setData] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // استخراج اسم القسم الحالي للترويسة
  const getCurrentTabLabel = () => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item[0] === tab);
      if (found) return found[1];
    }
    return '';
  };

  async function load() {
    setLoading(true);
    try {
      const map: any = {
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
      const x = await api(map[tab]);
      setData(Array.isArray(x) ? x : [x]);
    } catch (e: any) {
      setMsg(e.message);
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
      if (tab === 'products') {
        endpoint = v.id ? `/api/admin/products/${v.id}` : '/api/admin/products';
      } else if (tab === 'faq') {
        endpoint = v.id ? `/api/admin/faq/${v.id}` : '/api/admin/faq';
      }
      
      await api(endpoint, v.id ? 'PUT' : 'POST', v);
      setMsg('تم الحفظ بنجاح');
      setEditing(null);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function del(id: string) {
    if (!confirm('تأكيد الحذف؟')) return;
    try {
      if (tab === 'contact') {
        await api(`/api/admin/contact?id=${id}`, 'DELETE');
      } else if (tab === 'faq') {
        await api(`/api/admin/faq/${id}`, 'DELETE');
      } else {
        await api(tab === 'products' ? `/api/admin/products/${id}` : `/api/admin/${tab}`, 'DELETE', { id });
      }
      setMsg('تم الحذف');
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

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]" dir="rtl">
      
      {/* القائمة الجانبية الاحترافية الجديدة */}
      <aside className="bg-muted/10 border border-border/40 rounded-3xl p-4 h-fit lg:sticky lg:top-5 space-y-6 shadow-xs">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1.5">
            <h3 className="px-3 text-[11px] font-serif font-bold uppercase tracking-wider text-[#D4AF37]/90">
              {group.title}
            </h3>
            <div className="space-y-1 pt-1">
              {group.items.map(([k, t, Icon]) => (
                <button 
                  key={k} 
                  onClick={() => { setTab(k); setEditing(null); setMsg(''); }} 
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
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* قسم المحتوى الرئيسي */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-5">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">{getCurrentTabLabel()}</h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5 font-light">تعديل مباشر لبيانات المتجر من قاعدة البيانات.</p>
          </div>
          {!editing && ['products', 'categories', 'offers', 'coupons', 'shipping', 'homepage', 'gift-cards', 'relations', 'faq'].includes(tab) && (
            <button className="px-5 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-xs md:text-sm shadow-sm hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer" onClick={() => setEditing(tab === 'products' ? emptyProduct : tab === 'faq' ? { question: '', answer: '', category: 'general', displayOrder: 0, published: true } : {})}>
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
  );
}

// ... باقي المكونات (Editor, Content, Analytics, Customers, Orders, Sortable, Media, Reviews) تعمل بنفس الشكل السابق تماماً دون تغيير ...
