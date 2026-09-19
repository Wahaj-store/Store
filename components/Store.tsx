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

function QuickView({ p, onClose }: { p: any; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="lux-card max-w-2xl w-full overflow-hidden p-4 bg-[var(--bg)] text-foreground border border-[var(--brand-gold)]/30 shadow-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <img
            src={p.images?.[0]?.url || "/placeholder.svg"}
            alt={p.name}
            className="aspect-square w-full rounded-xl object-cover"
          />
          <div className="self-center">
            <h2 className="text-2xl font-semibold">{p.name}</h2>
            <p className="text-[#D4AF37] mt-3 text-xl font-semibold">
              {Number(p.price).toLocaleString("ar-EG")} ج.م
            </p>
            <p className="text-muted-foreground mt-4 leading-8 text-sm">
              {p.description || "قطعة مختارة بعناية من وَهَج."}
            </p>
            <a href={`/product/${p.slug}`} className="btn btn-gold mt-6 w-full text-center block py-3 rounded-xl bg-[#D4AF37] text-black font-bold">
              التفاصيل الكاملة
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ p }: { p: any }) {
  const [quick, setQuick] = useState(false);
  const discount =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : 0;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border/40 bg-[var(--bg)] p-3 shadow-sm transition-all hover:shadow-md">
      <div>
        <div className="relative overflow-hidden rounded-xl bg-muted/35">
          <a href={`/product/${p.slug}`}>
            <img
              src={p.images?.[0]?.url || "/placeholder.svg"}
              alt={p.images?.[0]?.alt || p.name}
              loading="lazy"
              className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </a>
          <div className="absolute top-2.5 start-2.5 z-10">
            <WishlistButton productId={p.id} />
          </div>
          <button
            type="button"
            onClick={() => setQuick(true)}
            className="absolute bottom-2.5 end-2.5 rounded-full border border-border/60 bg-[var(--bg)]/90 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[#D4AF37]"
          >
            عرض سريع
          </button>
          {discount > 0 && (
            <span className="absolute top-2.5 end-2.5 rounded-full bg-[#171513] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
        </div>
        
        <div className="pt-3">
          <a href={`/product/${p.slug}`}>
            <h3 className="font-medium text-sm line-clamp-1 hover:text-[#D4AF37] transition-colors">{p.name}</h3>
          </a>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-bold text-base text-[#D4AF37]">{Number(p.price).toLocaleString("ar-EG")} ج.م</span>
            {p.comparePrice && (
              <del className="text-xs text-muted-foreground">
                {Number(p.comparePrice).toLocaleString("ar-EG")} ج.م
              </del>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {p.stock > 0
              ? p.stock <= 5
                ? "متبقي القليل"
                : "متوفر"
              : "غير متوفر"}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-border/20">
        <AddToCart product={p} />
      </div>

      {quick && <QuickView p={p} onClose={() => setQuick(false)} />}
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
        <span className="text-[#D4AF37] text-sm font-medium tracking-wide">{subtitle}</span>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-6">
        {data.products.map((p: any) => (
          <Card key={p.id} p={p} />
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
          "--brand-gold": data.theme?.accentColor || "#D4AF37",
        } as CSSProperties
      }
    >
      <main>
        {sections.map((sec: any) => {
          if (sec.type === "hero")
            return (
              <section
                key={sec.id}
                className="container grid min-h-[580px] items-center gap-10 py-12 md:grid-cols-2"
              >
                <div className="order-2 md:order-1">
                  <span className="text-[#D4AF37] text-sm font-medium tracking-wide">
                    وَهَج — تفاصيل تصنع الفرق
                  </span>
                  <h1 className="mt-4 text-4xl font-semibold leading-[1.3] md:text-6xl tracking-tight">
                    {sec.title || "لأن أناقتك تستحق أن تتألّق"}
                  </h1>
                  <p className="mt-5 text-base md:text-lg leading-8 text-muted-foreground">
                    {sec.subtitle ||
                      "قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة."}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={sec.ctaUrl || "/shop"} className="btn btn-gold bg-[#D4AF37] text-black font-bold px-6 py-3.5 rounded-xl shadow-md hover:opacity-90 flex items-center gap-2">
                      {sec.ctaText || "اكتشفي المجموعة"}{" "}
                      <ChevronLeft size={18} />
                    </a>
                    <a href="/shop" className="btn border border-border px-6 py-3.5 rounded-xl font-medium hover:border-[#D4AF37] transition-colors">
                      تسوقي الآن
                    </a>
                  </div>
                </div>
                <div className="order-1 h-[420px] overflow-hidden rounded-2xl md:order-2 md:h-[540px] shadow-lg">
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
              <section key={sec.id} className="border-y border-border/40 py-20 bg-muted/10">
                <div className="container max-w-3xl text-center">
                  <span className="text-[#D4AF37] text-sm font-medium tracking-wide">قصة وَهَج</span>
                  <h2 className="mt-3 text-3xl font-semibold">
                    {sec.title || "تفاصيل صغيرة تصنع وهجًا كبيرًا."}
                  </h2>
                  <p className="mt-5 leading-8 text-muted-foreground">
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
                className="wahaj-collections py-20 border-t border-border/30 bg-muted/5"
              >
                <div className="container">
                  <div className="wahaj-collections__head mb-12 text-right">
                    <span className="inline-block text-[#D4AF37] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[#D4AF37]/10 mb-3">
                      اكتشفي عالم وَهَج
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                      {sec.title || "اختاري ما يشبهك"}
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-xl">
                      {sec.subtitle ||
                        "مجموعات مختارة بعناية لتمنح كل إطلالة لمستها الخاصة من الفخامة."}
                    </p>
                  </div>
                  <div className="wahaj-collections__grid grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
                    {data.categories.map((c: any) => (
                      <a
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        className="group relative overflow-hidden rounded-3xl aspect-[3/4] block shadow-md border border-border/40 transition-all duration-500 hover:shadow-xl hover:border-[#D4AF37]/60"
                      >
                        <img
                          src={
                            c.imageUrl ||
                            data.products?.[0]?.images?.[0]?.url ||
                            "/placeholder.svg"
                          }
                          alt={c.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5 text-white text-right">
                          <h3 className="font-bold text-lg md:text-xl tracking-wide group-hover:text-[#D4AF37] transition-colors">
                            {c.name}
                          </h3>
                          <span className="text-xs text-[#D4AF37] mt-2 flex items-center justify-end gap-1.5 font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
                            <span>اكتشفي المجموعة</span>
                            <ChevronLeft size={15} className="rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />
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
              <section id="offers" key={sec.id} className="container py-16">
                <div className="lux-card p-8 md:p-12 rounded-3xl border border-[#D4AF37]/30 bg-muted/20">
                  <span className="text-[#D4AF37] text-sm font-medium">عروض مختارة</span>
                  <h2 className="mt-2 text-3xl font-semibold">
                    {sec.title || "لمعتك تبدأ من التفاصيل"}
                  </h2>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {data.offers.slice(0, 3).map((o: any) => (
                      <div key={o.id} className="border border-border/60 p-5 rounded-2xl bg-[var(--bg)] shadow-sm">
                        <b className="text-base">{o.name}</b>
                        <p className="text-muted-foreground mt-2 text-sm">
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
              <section key={sec.id} className="container py-16">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { icon: Truck, title: "شحن داخل مصر", desc: "توصيل سريع لكافة المحافظات", href: "/shipping-policy" },
                    { icon: ShieldCheck, title: "طرق دفع متعددة", desc: "دفع آمن (إيستاباي، فودافون، كاش)", href: "/payment-policy" },
                    { icon: RotateCcw, title: "استبدال واسترجاع", desc: "سياسة مرنة خلال 14 يوماً", href: "/returns-policy" },
                    { icon: MessageCircle, title: "دعم سريع", desc: "خدمة عملاء متاحة على مدار الساعة", href: "/contact" },
                  ].map(({ icon: I, title, desc, href }) => (
                    <a
                      href={href}
                      key={title}
                      className="group flex flex-col items-center text-center p-6 rounded-2xl border border-border/40 bg-[var(--bg)] shadow-sm transition-all hover:border-[#D4AF37] hover:shadow-md"
                    >
                      <div className="p-3.5 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] mb-3 group-hover:scale-110 transition-transform">
                        <I size={24} />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </a>
                  ))}
                </div>
              </section>
            );
          return (
            <section key={sec.id} className="container py-14">
              <div className="lux-card p-8 text-center rounded-2xl border border-border/40">
                <h2 className="text-2xl font-semibold">
                  {sec.title || "وَهَج"}
                </h2>
                {sec.subtitle && (
                  <p className="text-muted-foreground mt-3 leading-8 text-sm">{sec.subtitle}</p>
                )}
                {sec.imageUrl && (
                  <img
                    src={sec.imageUrl}
                    alt={sec.title || "وَهَج"}
                    className="mx-auto mt-6 max-h-96 rounded-xl object-cover"
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
