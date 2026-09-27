"use client";
import {
  ChevronLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import ProductCard from "./ProductCard";

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
    <section className="container section wahaj-products-section">
      <div className="wahaj-products-section__head">
        <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-2">
          {subtitle}
        </span>
        <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">{title}</h2>
      </div>
      <div className="wahaj-product-grid">
        {data.products.map((p: any) => (
          <ProductCard key={p.id} product={p} />
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
    <div className="bg-background text-foreground min-h-screen transition-colors duration-300">
      <main>
        {sections.map((sec: any) => {
          if (sec.type === "hero")
            return (
              <section
                key={sec.id}
                className="container grid min-h-[620px] items-center gap-12 py-16 md:grid-cols-2"
              >
                <div className="order-2 md:order-1 text-right">
                  <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-4">
                    وَهَج — تفاصيل تصنع الفرق
                  </span>
                  <h1 className="text-4xl font-serif font-bold leading-[1.25] md:text-6xl tracking-tight">
                    {sec.title || "لأن أناقتك تستحق أن تتألّق"}
                  </h1>
                  <p className="mt-6 text-base md:text-lg leading-relaxed text-muted-foreground font-light max-w-xl">
                    {sec.subtitle ||
                      "قطع مختارة بعناية لتضيف لمسة من الوهج والفخامة إلى كل إطلالة."}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <a href={sec.ctaUrl || "/shop"} className="btn btn-gold bg-[var(--gold)] text-[var(--gold-contrast)] font-semibold px-7 py-4 rounded-2xl shadow-lg hover:opacity-90 flex items-center gap-2.5 transition-all">
                      {sec.ctaText || "اكتشفي المجموعة"}{" "}
                      <ChevronLeft size={18} />
                    </a>
                    <a href="/shop" className="btn border border-border/80 px-7 py-4 rounded-2xl font-medium hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all">
                      تسوقي الآن
                    </a>
                  </div>
                </div>
                <div className="order-1 h-[440px] overflow-hidden rounded-3xl md:order-2 md:h-[580px] shadow-xl border border-border/20">
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
              <section key={sec.id} className="border-y border-border/30 py-24 bg-muted/10">
                <div className="container max-w-3xl text-center">
                  <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-4">
                    قصة وَهَج
                  </span>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                    {sec.title || "تفاصيل صغيرة تصنع وهجًا كبيرًا."}
                  </h2>
                  <p className="mt-6 text-base md:text-lg leading-relaxed text-muted-foreground font-light">
                    {sec.subtitle || s.brand_story || "نؤمن بأن الجمال الحقيقي يكمن في التفاصيل الدقيقة التي تعكس شخصيتك الفريدة."}
                  </p>
                </div>
              </section>
            );
          if (sec.type === "collections")
            return (
              <section
                id="collections"
                key={sec.id}
                className="wahaj-collections py-24 border-t border-border/30 bg-muted/5"
              >
                <div className="container">
                  <div className="wahaj-collections__head mb-14 text-right">
                    <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-3">
                      اكتشفي عالم وَهَج
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-foreground">
                      {sec.title || "اختاري ما يشبهك"}
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-xl font-light">
                      {sec.subtitle ||
                        "مجموعات مختارة بعناية لتمنح كل إطلالة لمستها الخاصة من الرقي والفخامة."}
                    </p>
                  </div>
                  <div className="wahaj-collections__grid grid grid-cols-2 md:grid-cols-4 gap-6">
                    {data.categories.map((c: any) => (
                      <a
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        className="group relative overflow-hidden rounded-3xl aspect-[3/4] block shadow-md border border-border/40 transition-all duration-500 hover:shadow-2xl hover:border-[var(--gold)]"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6 text-white text-right">
                          <h3 className="font-serif font-bold text-lg md:text-xl tracking-wide group-hover:text-[var(--gold)] transition-colors">
                            {c.name}
                          </h3>
                          <span className="text-xs text-[var(--gold)] mt-2.5 flex items-center justify-end gap-1.5 font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
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
              <section id="offers" key={sec.id} className="container section wahaj-products-section">
                <div className="lux-card p-8 md:p-14 rounded-3xl border border-[var(--gold)]/30 bg-muted/20 shadow-lg">
                  <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-3">
                    عروض مختارة
                  </span>
                  <h2 className="text-3xl font-serif font-bold">
                    {sec.title || "لمعتك تبدأ من التفاصيل"}
                  </h2>
                  <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {data.offers.slice(0, 3).map((o: any) => (
                      <div key={o.id} className="border border-border/60 p-6 rounded-2xl bg-[var(--bg)] shadow-sm hover:border-[var(--gold)] transition-colors">
                        <b className="font-serif text-lg block mb-2">{o.name}</b>
                        <p className="text-muted-foreground text-sm font-light">
                          {o.discountValue
                            ? `خصم ${Number(o.discountValue).toLocaleString("ar-EG")}`
                            : "عرض خاص لفترة محدودة"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          if (sec.type === "trust")
            return (
              <section key={sec.id} className="container section wahaj-products-section">
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  {[
                    { icon: Truck, title: "شحن داخل مصر", desc: "توصيل سريع لكافة المحافظات", href: "/policies/shipping" },
                    { icon: ShieldCheck, title: "طرق دفع متعددة", desc: "دفع آمن (إنستايباي، فودافون كاش، COD)", href: "/payment-policy" },
                    { icon: RotateCcw, title: "استبدال واسترجاع", desc: "سياسة مرنة خلال 14 يوماً", href: "/policies/returns" },
                    { icon: MessageCircle, title: "دعم سريع", desc: "خدمة عملاء متاحة على مدار الساعة", href: "/contact" },
                  ].map(({ icon: I, title, desc, href }) => (
                    <a
                      href={href}
                      key={title}
                      className="group flex flex-col items-center text-center p-8 rounded-3xl border border-border/40 bg-[var(--bg)] shadow-sm transition-all hover:border-[var(--gold)] hover:shadow-lg"
                    >
                      <div className="p-4 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] mb-4 group-hover:scale-110 transition-transform">
                        <I size={26} />
                      </div>
                      <h3 className="font-serif font-semibold text-base mb-2">{title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-light">{desc}</p>
                    </a>
                  ))}
                </div>
              </section>
            );
          return (
            <section key={sec.id} className="container py-16">
              <div className="lux-card p-10 text-center rounded-3xl border border-border/40 shadow-md">
                <h2 className="text-2xl font-serif font-bold">
                  {sec.title || "وَهَج"}
                </h2>
                {sec.subtitle && (
                  <p className="text-muted-foreground mt-3 leading-relaxed text-sm font-light">{sec.subtitle}</p>
                )}
                {sec.imageUrl && (
                  <img
                    src={sec.imageUrl}
                    alt={sec.title || "وَهَج"}
                    className="mx-auto mt-6 max-h-96 rounded-2xl object-cover shadow-md"
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
