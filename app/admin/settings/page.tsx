'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Megaphone, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

type MarqueeItem = { id: string; text: string; href: string; imageUrl: string };
type SettingValues = Record<string, string>;

const defaults: SettingValues = {
  hero_marquee_speed: '28',
  hero_marquee_bg: '#171513',
  hero_marquee_color: '#ffffff',
  hero_marquee_accent: '#c8a96b',
  hero_height_desktop: '420',
  hero_height_mobile: '320',
};

const fields = [
  { key: 'hero_marquee_speed', label: 'مدة دورة حركة العروض', hint: 'المدة بالثواني لإكمال دورة كاملة. من 12 إلى 90 ثانية؛ الرقم الأصغر يجعل الحركة أسرع.' },
  { key: 'hero_height_desktop', label: 'ارتفاع الواجهة الرئيسية على الكمبيوتر (بكسل)', hint: 'من 260 إلى 700 بكسل.' },
  { key: 'hero_height_mobile', label: 'ارتفاع الواجهة الرئيسية على الهاتف (بكسل)', hint: 'من 220 إلى 600 بكسل.' },
];

function parseMarqueeItems(value: unknown): MarqueeItem[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
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
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/config', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'تعذر تحميل الإعدادات.');
        if (!active) return;
        const loaded = { ...(data.settings || {}), ...(data.heroSettings || {}) };
        const values = Object.fromEntries(Object.keys(defaults).map(key => [key, String(loaded[key] ?? defaults[key])])) as SettingValues;
        setS(values);
        setMarqueeItems(parseMarqueeItems(data.heroSettings?.hero_marquee_items ?? data.settings?.hero_marquee_items));
      })
      .catch(reason => {
        if (active) {
          setError(true);
          setMessage(reason?.message || 'تعذر تحميل الإعدادات.');
        }
      })
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
    setError(false);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroSettings: { ...s, hero_marquee_items: cleanItems } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ إعدادات الواجهة.');
      setMarqueeItems(cleanItems.map((item, index) => ({ ...item, id: `saved-${index}-${Date.now()}` })));
      setMessage('تم حفظ إعدادات الواجهة والإعلانات داخل قسم الواجهة الرئيسية بنجاح.');
    } catch (reason: any) {
      setError(true);
      setMessage(reason?.message || 'تعذر حفظ إعدادات الواجهة.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="container py-10" dir="rtl"><p className="muted">جارٍ تحميل إعدادات الواجهة…</p></main>;

  const colorFields = [
    { key: 'hero_marquee_bg', label: 'خلفية الشريط', fallback: '#171513' },
    { key: 'hero_marquee_color', label: 'لون النص', fallback: '#ffffff' },
    { key: 'hero_marquee_accent', label: 'لون الفواصل', fallback: '#c8a96b' },
  ];
  const previewItems = marqueeItems.filter(item => item.text.trim());

  return <main className="container max-w-5xl py-6 sm:py-10" dir="rtl">
    <Link href="/admin?tab=settings" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-(--gold)"><ArrowRight size={14} /> العودة إلى الإعدادات العامة</Link>

    <header className="relative mt-5 overflow-hidden rounded-[26px] border border-border/50 bg-(--surface) p-5 shadow-sm sm:p-7">
      <div className="absolute -left-7 -top-10 h-32 w-32 rounded-full bg-(--gold)/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-(--gold)/25 bg-(--gold)/10 text-(--gold)"><Sparkles size={20} /></span>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-(--gold)">وَهَج · إعدادات المتجر</p>
          <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">الواجهة الرئيسية وشريط العروض</h1>
          <p className="muted mt-2 max-w-2xl text-xs leading-6">تُحفظ هذه الخيارات داخل إعدادات قسم الواجهة الرئيسية، وتُطبّق على المتجر دون إضافتها إلى قائمة الإعدادات العامة.</p>
        </div>
      </div>
    </header>

    <div className="lux-card mt-5 grid gap-6 p-4 sm:mt-7 sm:p-6">
      <section className="grid gap-4" aria-labelledby="hero-settings-title">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/30 text-(--gold)"><Sparkles size={16} /></span>
          <h2 id="hero-settings-title" className="font-serif text-base font-bold">إعدادات حركة ومقاس الواجهة</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(field => <label key={field.key} className="block text-sm font-medium">
            {field.label}
            <input
              type="number"
              min={field.key === 'hero_marquee_speed' ? 12 : field.key === 'hero_height_desktop' ? 260 : 220}
              max={field.key === 'hero_marquee_speed' ? 90 : field.key === 'hero_height_desktop' ? 700 : 600}
              step="1"
              className="input mt-2"
              value={String(s[field.key] ?? defaults[field.key])}
              onChange={event => update(field.key, event.target.value)}
            />
            <small className="muted mt-1 block text-[10px] leading-5">{field.hint}</small>
          </label>)}
        </div>
      </section>

      <section className="grid gap-4 border-t border-border/50 pt-5" aria-labelledby="marquee-custom-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-(--gold)"><Megaphone size={16} /></span>
            <div>
              <h2 id="marquee-custom-title" className="font-serif text-base font-bold">إعلانات وبنرات الشريط</h2>
              <p className="muted mt-1 text-[10px] leading-5">كل إعلان محفوظ هنا فقط. أضيفي نصًا ورابطًا وصورة اختيارية تظهر بجواره.</p>
            </div>
          </div>
          <button type="button" onClick={() => setMarqueeItems(items => [...items, newMarqueeItem()])} disabled={marqueeItems.length >= 8} className="btn inline-flex items-center gap-2 text-xs disabled:opacity-50">
            <Plus size={15} /> إضافة إعلان
          </button>
        </div>

        {marqueeItems.length ? <div className="grid gap-3">
          {marqueeItems.map((item, index) => <article key={item.id} className="grid gap-3 rounded-2xl border border-border/50 bg-(--bg)/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
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
            <button type="button" onClick={() => setMarqueeItems(items => items.filter(current => current.id !== item.id))} aria-label={`حذف الإعلان ${index + 1}`} title="حذف الإعلان" className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-xl border border-red-500/25 px-3 text-xs text-red-600 transition hover:bg-red-500/5 dark:text-red-300">
              <Trash2 size={14} /> حذف الإعلان
            </button>
          </article>)}
        </div> : <p className="rounded-2xl border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">لا توجد إعلانات مخصصة بعد. أضيفي إعلانًا ليظهر في الشريط المتحرك.</p>}
      </section>

      <section className="grid gap-4 border-t border-border/50 pt-5" aria-labelledby="marquee-colors-title">
        <h2 id="marquee-colors-title" className="font-serif text-base font-bold">ألوان الشريط</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {colorFields.map(field => <label key={field.key} className="text-sm font-medium">
            {field.label}
            <div className="mt-2 flex items-center gap-3">
              <input aria-label={field.label} type="color" className="h-10 w-14 cursor-pointer rounded-xl border border-border bg-transparent p-1" value={/^#[0-9a-f]{6}$/i.test(s[field.key] || '') ? s[field.key] : field.fallback} onChange={event => update(field.key, event.target.value)} />
              <input dir="ltr" className="input min-w-0 text-left" value={s[field.key] || ''} onChange={event => update(field.key, event.target.value)} />
            </div>
          </label>)}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60" aria-label="معاينة شريط العروض">
        <div className="flex min-h-10 flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 py-2 text-center text-sm font-semibold" style={{ background: s.hero_marquee_bg, color: s.hero_marquee_color }}>
          {previewItems.length ? previewItems.slice(0, 8).map((item, index) => <span key={`preview-${index}`} className="inline-flex items-center gap-2">
            <span style={{ color: s.hero_marquee_accent }}>•</span>
            {item.imageUrl && <Image src={item.imageUrl} width={88} height={32} alt="" className="h-7 w-auto max-w-[88px] object-contain" />}
            <span>{item.text}</span>
          </span>) : <span>معاينة إعلانات وَهَج</span>}
        </div>
      </section>

      {message && <p role="status" className={`rounded-xl border p-3 text-xs ${error ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300' : 'border-green-500/25 bg-green-500/5 text-green-700 dark:text-green-300'}`}>{message}</p>}
      <button type="button" onClick={save} disabled={saving} className="btn btn-gold inline-flex w-fit items-center gap-2 disabled:opacity-60"><Save size={15} />{saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الواجهة'}</button>
    </div>
  </main>;
}
