"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  ChevronLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import AddToCart from "./AddToCart";
import WishlistButton from "./WishlistButton";
function Pay({ methods }: { methods: any[] }) {
  return (
    <div
      className="mt-3 flex items-center justify-center gap-2 rounded-md border p-2 hairline"
      aria-label="طرق الدفع المتاحة"
    >
      <span
        className="payment-icon"
        title="الدفع عند الاستلام"
        aria-label="الدفع عند الاستلام"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </span>
      {methods.some((x) => x.method === "VODAFONE_CASH") && (
        <span
          className="payment-icon"
          title="Vodafone Cash"
          aria-label="Vodafone Cash"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 6h14v12H5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
      )}
      {methods.some((x) => x.method === "INSTAPAY") && (
        <span className="payment-icon" title="InstaPay" aria-label="InstaPay">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 7h12v10H6z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
      )}
    </div>
  );
}
function QuickView({ p, onClose }: { p: any; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="lux-card max-w-2xl w-full overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <img
            src={p.images?.[0]?.url || "/placeholder.svg"}
            alt={p.name}
            className="aspect-square w-full rounded-lg object-cover"
          />
          <div className="self-center">
            <h2 className="text-2xl font-semibold">{p.name}</h2>
            <p className="gold mt-3 text-xl font-semibold">
              {Number(p.price).toLocaleString("ar-EG")} ج.م
            </p>
            <p className="muted mt-4 leading-8">
              {p.description || "قطعة مختارة بعناية من وَهَج."}
            </p>
            <a href={`/product/${p.slug}`} className="btn btn-gold mt-6 w-full">
              التفاصيل الكاملة
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
function Card({ p, methods }: { p: any; methods: any[] }) {
  const [quick, setQuick] = useState(false);
  const discount =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : 0;
  return (
    <article>
      <div className="relative overflow-hidden rounded-lg bg-[#e9e1d5]">
        <a href={`/product/${p.slug}`}>
          <img
            src={p.images?.[0]?.url || "/placeholder.svg"}
            alt={p.images?.[0]?.alt || p.name}
            loading="lazy"
            className="aspect-square w-full object-cover transition duration-500 hover:scale-105"
          />
        </a>
        <div className="absolute top-3 start-3">
          <WishlistButton productId={p.id} />
        </div>
        <button
          type="button"
          onClick={() => setQuick(true)}
          className="absolute bottom-3 end-3 rounded-full border bg-[var(--bg)]/90 px-3 py-2 text-xs"
        >
          عرض سريع
        </button>
        {discount > 0 && (
          <span className="absolute top-3 end-3 rounded-full bg-[#171513] px-2 py-1 text-xs text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="pt-4">
        <a href={`/product/${p.slug}`}>
          <h3 className="font-medium">{p.name}</h3>
        </a>
        <div className="mt-2 flex items-center gap-2">
          <b>{Number(p.price).toLocaleString("ar-EG")} ج.م</b>
          {p.comparePrice && (
            <del className="text-sm muted">
              {Number(p.comparePrice).toLocaleString("ar-EG")} ج.م
            </del>
          )}
        </div>
        <p className="mt-1 text-xs muted">
          {p.stock > 0
            ? p.stock <= 5
              ? "متبقي القليل"
              : "متوفر"
            : "غير متوفر"}
        </p>
        <AddToCart product={p} />
        <Pay methods={methods} />
        {quick && <QuickView p={p} onClose={() => setQuick(false)} />}
      </div>
    </article>
  );
}
function ProductsSection({
  data,
  title = "الأكثر تألقًا",
  subtitle = "اختيارات وَهَج",
}: {
  data: any;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="container py-16">
      <div className="mb-8">
        <span className="gold text-sm">{subtitle}</span>
        <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-6">
        {data.products.slice(0, 8).map((p: any) => (
          <Card key={p.id} p={p} methods={data.payments} />
        ))}
      </div>
    </section>
  );
}
export default function Store({ data }: { data: any }) {
  const s = data.settings || {};
  const now = Date.now();
  const sections = (data.sections || [])
    .filter(
      (x: any) =>
        x.visible !== false &&
        (!x.startsAt || new Date(x.startsAt).getTime() <= now) &&
        (!x.endsAt || new Date(x.endsAt).getTime() >= now),
    )
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  return (
    <div
      style={
        {
          "--brand-bg": data.theme?.background || "#F8F5EF",
          "--brand-fg": data.theme?.textColor || "#171513",
          "--brand-gold": data.theme?.accentColor || "#C8A96B",
        } as CSSProperties
      }
    >
      <main>
        {sections.map((sec: any) => {
          if (sec.type === "hero")
            return (
              <section
                key={sec.id}
                className="container grid min-h-[620px] items-center gap-10 py-12 md:grid-cols-2"
              >
                <div className="order-2 md:order-1">
                  <span className="gold text-sm">
                    وَهَج — تفاصيل تصنع الفرق
                  </span>
                  <h1 className="mt-5 text-4xl font-semibold leading-[1.3] md:text-6xl">
                    {sec.title || "لأن أناقتك تستحق أن تتألّق"}
                  </h1>
                  <p className="mt-6 text-lg leading-9 muted">
                    {sec.subtitle ||
                      "قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة."}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={sec.ctaUrl || "/shop"} className="btn btn-gold">
                      {sec.ctaText || "اكتشفي المجموعة"}{" "}
                      <ChevronLeft size={18} />
                    </a>
                    <a href="/shop" className="btn">
                      تسوقي الآن
                    </a>
                  </div>
                </div>
                <div className="order-1 h-[480px] overflow-hidden rounded-lg md:order-2 md:h-[600px]">
                  <img
                    src={
                      sec.imageUrl ||
                      data.products?.[0]?.images?.[0]?.url ||
                      "/placeholder.svg"
                    }
                    alt="مجموعة وَهَج"
                    className="h-full w-full object-cover"
                  />
                </div>
              </section>
            );
          if (sec.type === "story")
            return (
              <section key={sec.id} className="border-y py-20 hairline">
                <div className="container max-w-3xl text-center">
                  <span className="gold text-sm">قصة وَهَج</span>
                  <h2 className="mt-4 text-3xl font-semibold">
                    {sec.title || "تفاصيل صغيرة تصنع وهجًا كبيرًا."}
                  </h2>
                  <p className="mt-6 leading-9 muted">
                    {sec.subtitle || s.brand_story}
                  </p>
                </div>
              </section>
            );
          if (sec.type === "collections")
            return (
              <section
                id="collections"
                key={sec.id}
                className="wahaj-collections"
              >
                <div className="container">
                  <div className="wahaj-collections__head">
                    <span className="wahaj-collections__eyebrow">
                      اكتشفي عالم وَهَج
                    </span>
                    <h2 className="wahaj-collections__title">
                      {sec.title || "اختاري ما يشبهك"}
                    </h2>
                    <p className="wahaj-collections__subtitle">
                      {sec.subtitle ||
                        "مجموعات مختارة بعناية لتمنح كل إطلالة لمستها الخاصة."}
                    </p>
                  </div>
                  <div className="wahaj-collections__grid">
                    {data.categories.map((c: any) => (
                      <a
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        className="wahaj-collection"
                      >
                        <img
                          src={
                            c.imageUrl ||
                            data.products?.[0]?.images?.[0]?.url ||
                            "/placeholder.svg"
                          }
                          alt={c.name}
                          loading="lazy"
                          className="wahaj-collection__image"
                        />
                        <div className="wahaj-collection__content">
                          <h3 className="wahaj-collection__name">{c.name}</h3>
                          <span className="wahaj-collection__link">
                            اكتشفي المجموعة <ChevronLeft size={15} />
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            );
          if (sec.type === "products" || sec.type === "featured")
            return (
              <ProductsSection
                key={sec.id}
                data={data}
                title={sec.title || "الأكثر تألقًا"}
                subtitle={sec.subtitle || "اختيارات وَهَج"}
              />
            );
          if (sec.type === "offers")
            return (
              <section id="offers" key={sec.id} className="container py-20">
                <div className="lux-card p-7 md:p-12">
                  <span className="gold text-sm">عروض مختارة</span>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {sec.title || "لمعتك تبدأ من التفاصيل"}
                  </h2>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {data.offers.slice(0, 3).map((o: any) => (
                      <div key={o.id} className="border p-4 hairline">
                        <b>{o.name}</b>
                        <p className="muted mt-2 text-sm">
                          {o.discountValue
                            ? `خصم ${Number(o.discountValue).toLocaleString("ar-EG")}`
                            : "عرض خاص"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          if (sec.type === "trust")
            return (
              <section key={sec.id} className="border-y py-16 hairline">
                <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
                  {[
                    [Truck, "شحن لجميع المحافظات"],
                    [ShieldCheck, "دفع آمن وموثوق"],
                    [RotateCcw, "استبدال واسترجاع"],
                    [MessageCircle, "دعم العملاء"],
                  ].map(([I, t]: any) => (
                    <div className="text-center" key={t}>
                      <I className="mx-auto mb-3 gold" />
                      <p className="text-sm">{t}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          return (
            <section key={sec.id} className="container py-14">
              <div className="lux-card p-8 text-center">
                <h2 className="text-2xl font-semibold">
                  {sec.title || "وَهَج"}
                </h2>
                {sec.subtitle && (
                  <p className="muted mt-3 leading-8">{sec.subtitle}</p>
                )}
                {sec.imageUrl && (
                  <img
                    src={sec.imageUrl}
                    alt={sec.title || "وَهَج"}
                    className="mx-auto mt-6 max-h-96 rounded-lg object-cover"
                  />
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
