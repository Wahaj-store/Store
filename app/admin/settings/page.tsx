'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2 } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

type MarqueeItem = { id: string; text: string; href: string; imageUrl: string };
type SettingValues = Record<string, string>;

const defaults: SettingValues = {
  whatsapp: '',
  announcement: 'شحن لجميع المحافظات',
  hero_marquee_speed: '28',
  hero_marquee_items: '[]',
  hero_marquee_bg: '#171513',
  hero_marquee_color: '#ffffff',
  hero_marquee_accent: '#c8a96b',
  hero_height_desktop: '420',
  hero_height_mobile: '320',
};

const fields = [
  { key: 'announcement', label: 'الإعلانات النصية العامة', hint: 'اكتب كل إعلان في سطر مستقل أو افصل بين الإعلانات بعلامة |.' },
  { key: 'hero_marquee_speed', label: 'مدة دورة حركة العروض', hint: 'المدة بالثواني لإكمال دورة كاملة. اختر رقمًا من 12 إلى 90؛ الرقم الأصغر يجعل الحركة أسرع.' },
  { key: 'hero_height_desktop', label: 'ارتفاع الواجهة الرئيسية على الكمبيوتر (بكسل)', hint: 'من 260 إلى 700 بكسل.' },
  { key: 'hero_height_mobile', label: 'ارتفاع الواجهة الرئيسية على الهاتف (بكسل)', hint: 'من 220 إلى 600 بكسل.' },
];

function parseMarqueeItems(value: unknown): MarqueeItem[] {
  try {
    const parsed = JSON.parse(typeof value === 'string' ? value : '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 8).map((item: any, index: number) => ({
      id: String(item?.id || `marquee-${index}`),
      text: String(item?.text || ''),
      href: String(item?.href || '/offers'),
      imageUrl: String(item?.imageUrl || ''),
    }));
  } catch {
    return [];
  }
}

function newMarqueeItem(): MarqueeItem {
  return { id: `marquee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: '', href: '/offers', imageUrl: '' };
}

export default function Settings() {
  const [s, setS] = useState<SettingValues>(defaults);
  const [marqueeItems, setMarqueeItems] = useState<MarqueeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/config', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'تعذر تحميل الإعدادات.');
        if (!active) return;
        const settings = { ...defaults, ...(data.settings || {}) };
        setS(settings);
        setMarqueeItems(parseMarqueeItems(settings.hero_marquee_items));
      })
      .catch(error => { if (active) setMessage(error?.message || 'تعذر تحميل الإعدادات.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key: string, value: string) => setS(old => ({ ...old, [key]: value }));
  const updateMarqueeItem = (id: string, key: keyof Omit<MarqueeItem, 'id'>, value: string) => {
    setMarqueeItems(items => items.map(item => item.id === id ? { ...item, [key]: value } : item));
  };

  async function save() {
    const cleanItems = marqueeItems
      .map(({ text, href, imageUrl }) => ({ text: text.trim(), href: href.trim() || '/offers', imageUrl: imageUrl.trim() }))
      .filter(item => item.text);
    setSaving(true);
    setMessage('');
    try {
      const settings = Object.fromEntries(Object.keys(defaults).map(key => [
        key,
        key === 'hero_marquee_items'
          ? JSON.stringify(cleanItems)
          : String(s[key] ?? defaults[key]),
      ]));
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الإعدادات.');
      setMarqueeItems(cleanItems.map((item, index) => ({ ...item, id: `saved-${index}-${Date.now()}` })));
      setMessage('تم حفظ الإعلانات والبنرات ومدة حركة الشريط بنجاح.');
    } catch (error: any) {
      setMessage(error?.message || 'تعذر حفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="container py-10" dir="rtl">جارٍ تحميل الإعدادات...</main>;

  const colorFields = [
    { key: 'hero_marquee_bg', label: 'لون خلفية الشريط', fallback: '#171513' },
    { key: 'hero_marquee_color', label: 'لون النص', fallback: '#ffffff' },
    { key: 'hero_marquee_accent', label: 'لون الفواصل', fallback: '#c8a96b' },
  ];
  const previewTexts = String(s.announcement || '').split(/\n|\|/).map((text: string) => text.trim()).filter(Boolean);
  const previewCustomItems = marqueeItems.filter(item => item.text.trim());

  return <main className="container py-10" dir="rtl">
    <a href="/admin" className="gold text-sm">‹ لوحة التحكم</a>
    <h1 className="mt-5 text-3xl font-semibold">إعدادات الواجهة وشريط العروض</h1>
    <p className="muted mt-2 text-sm">أضيفي الإعلانات النصية أو بنرات مرتبطة بروابط، ثم احفظي لمعاينتها على واجهة المتجر.</p>

    <div className="lux-card mt-8 grid gap-6 p-6">
      <label className="block text-sm font-medium">رقم واتساب
        <input className="input mt-2" value={s.whatsapp || ''} onChange={event => update('whatsapp', event.target.value)} />
      </label>

      {fields.map(field => <label key={field.key} className="block text-sm font-medium">
        {field.label}
        {field.key === 'announcement' ? (
          <textarea className="input mt-2 min-h-24" value={s[field.key] || ''} onChange={event => update(field.key, event.target.value)} />
        ) : (
          <input
            type="number"
            min={field.key === 'hero_marquee_speed' ? 12 : field.key === 'hero_height_desktop' ? 260 : 220}
            max={field.key === 'hero_marquee_speed' ? 90 : field.key === 'hero_height_desktop' ? 700 : 600}
            step="1"
            className="input mt-2"
            value={String(s[field.key] ?? defaults[field.key])}
            onChange={event => update(field.key, event.target.value)}
          />
        )}
        <small className="muted mt-1 block">{field.hint}</small>
      </label>)}

      <section className="grid gap-4 rounded-2xl border border-border/60 bg-muted/5 p-4" aria-labelledby="marquee-custom-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="marquee-custom-title" className="text-base font-semibold">إعلانات وبنرات مخصصة للشريط</h2>
            <p className="muted mt-1 text-xs leading-6">أضيفي نص الإعلان، ورابطه، وصورة اختيارية تظهر بجواره داخل الشريط المتحرك.</p>
          </div>
          <button type="button" onClick={() => setMarqueeItems(items => [...items, newMarqueeItem()])} disabled={marqueeItems.length >= 8} className="btn inline-flex items-center gap-2 disabled:opacity-50">
            <Plus size={15} /> إضافة إعلان
          </button>
        </div>

        {marqueeItems.length ? <div className="grid gap-3">
          {marqueeItems.map((item, index) => <article key={item.id} className="grid gap-3 rounded-xl border border-border/50 bg-(--bg) p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium">نص الإعلان
                <input maxLength={120} className="input mt-1.5" value={item.text} onChange={event => updateMarqueeItem(item.id, 'text', event.target.value)} placeholder={`الإعلان ${index + 1}`} />
              </label>
              <label className="block text-xs font-medium">الرابط عند الضغط
                <input maxLength={1000} dir="ltr" className="input mt-1.5 text-left" value={item.href} onChange={event => updateMarqueeItem(item.id, 'href', event.target.value)} placeholder="/offers أو https://example.com" />
              </label>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium">صورة البنر (اختياري)</span>
                <MediaPicker value={item.imageUrl} onChange={(value: unknown) => updateMarqueeItem(item.id, 'imageUrl', String(value || ''))} />
              </div>
            </div>
            <button type="button" onClick={() => setMarqueeItems(items => items.filter(current => current.id !== item.id))} aria-label={`حذف الإعلان ${index + 1}`} title="حذف الإعلان" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-red-500/25 px-3 text-xs text-red-600 transition hover:bg-red-500/5 dark:text-red-300">
              <Trash2 size={14} /> حذف الإعلان
            </button>
          </article>)}
        </div> : <p className="rounded-xl border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">لا توجد إعلانات مخصصة بعد. يمكنك إضافة إعلان نصي أو بنر مع رابط.</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {colorFields.map(field => <label key={field.key} className="text-sm font-medium">
          {field.label}
          <div className="mt-2 flex items-center gap-3">
            <input aria-label={field.label} type="color" className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1" value={/^#[0-9a-f]{6}$/i.test(s[field.key] || '') ? s[field.key] : field.fallback} onChange={event => update(field.key, event.target.value)} />
            <input dir="ltr" className="input min-w-0 text-left" value={s[field.key] || ''} onChange={event => update(field.key, event.target.value)} />
          </div>
        </label>)}
      </div>

      <section className="overflow-hidden rounded-xl border border-border/60" aria-label="معاينة شريط العروض">
        <div className="flex min-h-10 flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 py-2 text-center text-sm font-semibold" style={{ background: s.hero_marquee_bg, color: s.hero_marquee_color }}>
          {[...previewCustomItems, ...previewTexts.map(text => ({ text, imageUrl: '' }))].slice(0, 8).map((item: any, index: number) => <span key={`preview-${index}`} className="inline-flex items-center gap-2">
            <span style={{ color: s.hero_marquee_accent }}>•</span>
            {item.imageUrl && <Image src={item.imageUrl} width={88} height={32} alt="" className="h-7 w-auto max-w-[88px] object-contain" />}
            <span>{item.text}</span>
          </span>)}
          {!previewCustomItems.length && !previewTexts.length && <span>عروض وَهَج</span>}
        </div>
      </section>

      {message && <p role="status" className="text-sm">{message}</p>}
      <button type="button" onClick={save} disabled={saving} className="btn btn-gold w-fit disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
    </div>
  </main>;
}
