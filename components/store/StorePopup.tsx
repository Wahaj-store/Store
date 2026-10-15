"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import { isPopupEnabled, parsePopupConfig, safePopupHref, safePopupImageUrl } from "@/lib/popup-config";

const storageKey = "wahaj-store-popup-seen-v1";

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function StorePopup({ enabled, config: rawConfig, visitKey }: { enabled: unknown; config: unknown; visitKey: string }) {
  const active = isPopupEnabled(enabled);
  const config = parsePopupConfig(rawConfig);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (!active) return;

    let alreadySeen = false;
    try {
      if (config.frequency === "session") alreadySeen = window.sessionStorage.getItem(storageKey) === "1";
      if (config.frequency === "daily") alreadySeen = window.localStorage.getItem(storageKey) === localDateKey();
    } catch {
      // If storage is unavailable, keep the popup usable for this visit.
    }
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      try {
        if (config.frequency === "session") window.sessionStorage.setItem(storageKey, "1");
        if (config.frequency === "daily") window.localStorage.setItem(storageKey, localDateKey());
      } catch {
        // The dialog still works when browser storage is blocked.
      }
      setOpen(true);
    }, config.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, config.delaySeconds, config.frequency, visitKey]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const imageUrl = safePopupImageUrl(config.imageUrl);
  const ctaUrl = safePopupHref(config.ctaUrl);
  const isExternal = Boolean(ctaUrl && /^https?:\/\//i.test(ctaUrl));

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wahaj-store-popup-title"
        aria-describedby={config.message ? "wahaj-store-popup-message" : undefined}
        className="relative w-full max-w-lg overflow-hidden rounded-[26px] border border-(--border) bg-(--card) text-(--foreground) shadow-2xl"
        dir="rtl"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="إغلاق النافذة المنبثقة"
          className="absolute left-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-white/90 text-stone-800 shadow-xs transition hover:bg-white"
        >
          <X size={19} />
        </button>
        {imageUrl ? (
          <div className="relative aspect-16/8 w-full bg-(--surface)">
            <Image src={imageUrl} alt="" fill unoptimized sizes="(max-width: 600px) 100vw, 512px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center bg-[linear-gradient(135deg,var(--gold-soft),var(--background))] text-(--gold-muted)">
            <Sparkles size={28} strokeWidth={1.4} />
          </div>
        )}
        <div className="space-y-4 p-6 text-center sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-(--gold-muted)">وَهَج · تفاصيل تستحق أن تُرى</p>
            <h2 id="wahaj-store-popup-title" className="font-serif text-2xl font-bold leading-relaxed sm:text-3xl">{config.title}</h2>
            {config.message ? <p id="wahaj-store-popup-message" className="mx-auto mt-3 max-w-md whitespace-pre-wrap text-sm leading-7 text-(--muted-foreground)">{config.message}</p> : null}
          </div>
          {ctaUrl && config.ctaText ? (
            <a
              href={ctaUrl}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-(--gold) px-6 py-3 text-sm font-bold text-(--gold-contrast) transition hover:brightness-95"
            >
              {config.ctaText}<ArrowLeft size={16} />
            </a>
          ) : null}
          <div><button type="button" onClick={() => setOpen(false)} className="text-xs text-(--muted-foreground) underline underline-offset-4">ليس الآن</button></div>
        </div>
      </section>
    </div>
  );
}
