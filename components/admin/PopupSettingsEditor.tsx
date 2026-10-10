"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Clock3, Eye, Save, Sparkles } from "lucide-react";
import MediaPicker from "../MediaPicker";
import { DEFAULT_POPUP_CONFIG, parsePopupConfig, safePopupImageUrl, type PopupConfig } from "@/lib/popup-config";

const fieldClass = "w-full rounded-xl border border-border/60 bg-[var(--bg)] px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-[var(--gold)]";

type Props = {
  enabledValue: unknown;
  configValue: unknown;
  onSave: (settings: Record<string, string>) => Promise<void>;
};

export default function PopupSettingsEditor({ enabledValue, configValue, onSave }: Props) {
  const [enabled, setEnabled] = useState(String(enabledValue ?? "false").toLowerCase() === "true");
  const [config, setConfig] = useState<PopupConfig>(() => parsePopupConfig(configValue));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setEnabled(String(enabledValue ?? "false").toLowerCase() === "true");
    setConfig(parsePopupConfig(configValue));
  }, [enabledValue, configValue]);

  function set<K extends keyof PopupConfig>(key: K, value: PopupConfig[K]) {
    setConfig(current => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const normalized = parsePopupConfig(config);
      await onSave({
        popup_enabled: enabled ? "true" : "false",
        popup_config: JSON.stringify(normalized),
      });
      setNotice("تم حفظ إعدادات النافذة المنبثقة.");
    } catch (error: any) {
      setNotice(error?.message || "تعذر حفظ إعدادات النافذة.");
    } finally {
      setSaving(false);
    }
  }

  const previewImage = safePopupImageUrl(config.imageUrl);

  return (
    <section className="space-y-6 rounded-3xl border border-border/40 bg-muted/5 p-5 shadow-xs md:p-7" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--gold)]"><Sparkles size={18} /><h3 className="font-serif text-lg font-bold">النافذة المنبثقة للمتجر</h3></div>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">أنشئي رسالة ترحيب أو عرضًا يظهر للزوار في واجهة المتجر العامة حسب إعدادات الظهور أدناه.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/50 bg-[var(--bg)] px-3.5 py-2.5 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
          {enabled ? "مفعّلة" : "متوقفة"}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">عنوان النافذة
          <input className={fieldClass} maxLength={120} value={config.title} onChange={event => set("title", event.target.value)} placeholder={DEFAULT_POPUP_CONFIG.title} />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">نص زر الإجراء
          <input className={fieldClass} maxLength={50} value={config.ctaText} onChange={event => set("ctaText", event.target.value)} placeholder="تسوّقي الآن" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground md:col-span-2">نص الرسالة
          <textarea className={`${fieldClass} min-h-24 resize-y leading-7`} maxLength={700} value={config.message} onChange={event => set("message", event.target.value)} placeholder="اكتبي تفاصيل العرض أو الرسالة للزوار" />
          <span className="block text-left text-[10px]">{config.message.length}/700</span>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">رابط زر الإجراء
          <input className={fieldClass} maxLength={2048} value={config.ctaUrl} onChange={event => set("ctaUrl", event.target.value)} placeholder="/shop أو https://example.com" dir="ltr" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">تأخير العرض (ثوانٍ)
          <span className="relative block"><Clock3 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className={`${fieldClass} pr-9`} type="number" min={0} max={60} step={1} value={config.delaySeconds} onChange={event => set("delaySeconds", Math.max(0, Math.min(60, Number(event.target.value) || 0)))} /></span>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground md:col-span-2">صورة النافذة (اختياري)
          <input className={fieldClass} maxLength={2000} value={config.imageUrl} onChange={event => set("imageUrl", event.target.value)} placeholder="رابط صورة أو اختاري من مكتبة الوسائط" dir="ltr" />
          <div className="pt-2"><MediaPicker value={config.imageUrl} onChange={(value: unknown) => set("imageUrl", String(value || ""))} /></div>
          {previewImage ? <Image src={previewImage} alt="معاينة صورة النافذة" width={900} height={420} unoptimized className="mt-3 max-h-48 w-full rounded-xl object-cover" /> : null}
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">تكرار الظهور
          <select className={fieldClass} value={config.frequency} onChange={event => set("frequency", event.target.value as PopupConfig["frequency"])}>
            <option value="session">مرة واحدة في كل جلسة تصفح</option>
            <option value="daily">مرة واحدة يوميًا</option>
            <option value="always">في كل زيارة لصفحات المتجر</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-border/40 bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Eye size={15} /> معاينة تقريبية</div>
        <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-[var(--card)] p-5 text-center shadow-sm">
          {previewImage ? <Image src={previewImage} alt="" width={600} height={240} unoptimized className="mb-4 max-h-36 w-full rounded-xl object-cover" /> : <Sparkles size={22} className="mx-auto mb-3 text-[var(--gold)]" />}
          <b className="font-serif text-lg">{config.title || "عنوان النافذة"}</b>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{config.message || "نص الرسالة سيظهر هنا."}</p>
          {config.ctaText ? <span className="mt-3 inline-flex rounded-lg bg-[var(--gold)] px-4 py-2 text-xs font-bold text-[var(--gold-contrast)]">{config.ctaText}</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/30 pt-4">
        <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-bold text-[var(--gold-contrast)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"><Save size={16} />{saving ? "جارٍ الحفظ…" : "حفظ إعدادات النافذة"}</button>
        {notice ? <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">{notice.startsWith("تم") ? <Check size={14} className="text-green-600" /> : null}{notice}</span> : null}
      </div>
    </section>
  );
}
