'use client';
import { useEffect, useState } from 'react';

const defaults = { whatsapp: '', announcement: 'شحن لجميع المحافظات', hero_marquee_speed: '28', hero_marquee_bg: '#171513', hero_marquee_color: '#ffffff', hero_marquee_accent: '#c8a96b', hero_height_desktop: '420', hero_height_mobile: '320' };
const fields = [
  { key: 'announcement', label: 'نصوص شريط العروض', hint: 'افصل بين العروض بعلامة | أو اكتب كل عرض في سطر جديد.' },
  { key: 'hero_marquee_speed', label: 'مدة دورة الحركة بالثواني', hint: 'رقم من 12 إلى 90. الرقم الأصغر يعني حركة أسرع.' },
  { key: 'hero_height_desktop', label: 'ارتفاع الهيرو على الكمبيوتر (px)', hint: 'من 260 إلى 700 بكسل. جرّب 360 أو 400 لتصميم أقصر.' },
  { key: 'hero_height_mobile', label: 'ارتفاع الهيرو على الهاتف (px)', hint: 'من 220 إلى 600 بكسل. جرّب 280 أو 320 للهاتف.' },
];
export default function Settings() {
  const [s, setS] = useState<any>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/admin/config').then(r => r.json()).then(x => setS({ ...defaults, ...(x.settings || {}) })).catch(() => setMessage('تعذر تحميل الإعدادات.')).finally(() => setLoading(false)); }, []);
  const update = (key: string, value: string) => setS((old: any) => ({ ...old, [key]: value }));
  async function save() {
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: Object.fromEntries(Object.keys(defaults).map(key => [key, String(s[key] ?? defaults[key as keyof typeof defaults])])) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الإعدادات.');
      setMessage('تم حفظ إعدادات الهيرو وشريط العروض بنجاح.');
    } catch (error: any) { setMessage(error?.message || 'تعذر حفظ الإعدادات.'); }
    finally { setSaving(false); }
  }
  if (loading) return <main className="container py-10" dir="rtl">جارٍ تحميل الإعدادات...</main>;
  return <main className="container py-10" dir="rtl">
    <a href="/admin" className="gold text-sm">‹ لوحة التحكم</a>
    <h1 className="mt-5 text-3xl font-semibold">إعدادات المتجر</h1>
    <p className="muted mt-2 text-sm">إعدادات شريط العروض تحافظ على ألوان وخطوط وَهَج الأساسية، ويمكن معاينتها على واجهة المتجر بعد الحفظ.</p>
    <div className="lux-card mt-8 grid gap-6 p-6">
      <label className="block text-sm font-medium">رقم واتساب<input className="input mt-2" value={s.whatsapp || ''} onChange={e => update('whatsapp', e.target.value)} /></label>
      {fields.map(field => <label key={field.key} className="block text-sm font-medium">{field.label}{field.key === 'announcement' ? <textarea className="input mt-2 min-h-28" value={s[field.key] || ''} onChange={e => update(field.key, e.target.value)} /> : <input type="number" min={field.key === 'hero_marquee_speed' ? 12 : field.key === 'hero_height_desktop' ? 260 : 220} max={field.key === 'hero_marquee_speed' ? 90 : field.key === 'hero_height_desktop' ? 700 : 600} className="input mt-2" value={s[field.key] || (field.key === 'hero_marquee_speed' ? '28' : field.key === 'hero_height_desktop' ? '420' : '320')} onChange={e => update(field.key, e.target.value)} />}<small className="muted mt-1 block">{field.hint}</small></label>)}
      <div className="grid gap-4 sm:grid-cols-3">{[{key:'hero_marquee_bg',label:'لون خلفية الشريط'},{key:'hero_marquee_color',label:'لون النص'},{key:'hero_marquee_accent',label:'لون الفواصل'}].map(field => <label key={field.key} className="text-sm font-medium">{field.label}<div className="mt-2 flex items-center gap-3"><input aria-label={field.label} type="color" className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1" value={/^#[0-9a-f]{6}$/i.test(s[field.key] || '') ? s[field.key] : '#171513'} onChange={e => update(field.key,e.target.value)} /><input className="input min-w-0" value={s[field.key] || ''} onChange={e => update(field.key,e.target.value)} /></div></label>)}</div>
      <div className="rounded-lg border border-border p-4" style={{background:s.hero_marquee_bg,color:s.hero_marquee_color}}><div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center font-semibold"><span style={{color:s.hero_marquee_accent}}>•</span>{String(s.announcement || 'عروض وَهَج').split(/\n|\|/).filter(Boolean).slice(0,4).map((item:string,i:number)=><span key={i}>{item.trim()}</span>)}<span style={{color:s.hero_marquee_accent}}>•</span></div></div>
      {message && <p role="status" className="text-sm">{message}</p>}
      <button type="button" onClick={save} disabled={saving} className="btn btn-gold w-fit disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
    </div>
  </main>;
}
