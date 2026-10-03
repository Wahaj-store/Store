"use client";

import {
  ArrowLeft, ChevronLeft, Check, MessageCircle, RotateCcw, ShieldCheck, Sparkles, Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "../ProductCard";

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "right";
}) {
  return (
    <div className={`wahaj-section-heading wahaj-section-heading--${align}`}>
      <span className="wahaj-section-heading__eyebrow">
        <Sparkles size={13} strokeWidth={1.6} />
        {eyebrow}
      </span>
      <h2 className="wahaj-section-heading__title">{title}</h2>
      {subtitle ? <p className="wahaj-section-heading__subtitle">{subtitle}</p> : null}
    </div>
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
  const products = Array.isArray(data?.products) ? data.products : [];

  return (
    <section className="wahaj-products-section">
      <div className="container">
        <SectionHeading
          eyebrow={subtitle}
          title={title}
          subtitle="قطع مختارة بعناية، تجمع بين الأناقة الهادئة والتفاصيل التي تصنع حضورك."
          align="right"
        />
        <div className="wahaj-products-section__toolbar">
          <span className="wahaj-products-section__count">
            {products.length.toLocaleString("ar-EG")} منتجات مختارة
          </span>
          <a href="/shop" className="wahaj-products-section__link">
            اكتشفي المتجر
            <ArrowLeft size={15} />
          </a>
        </div>
        {products.length > 0 ? (
          <div className="wahaj-product-grid">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="wahaj-empty-state">سيتم عرض المنتجات المختارة هنا قريبًا.</div>
        )}
      </div>
    </section>
  );
}



export default function StoreSectionRenderer({
  data,
  sections,
  categories,
  offers,
  settings,
}: {
  data: any;
  sections: any[];
  categories: any[];
  offers: any[];
  settings: any;
}) {
  const s = settings || {};
  return (
    <div className="wahaj-storefront" dir="rtl">
      <main>
        {sections.map((sec: any) => {
          if (sec.type === "hero") {
            const image =
              sec.imageUrl || data?.products?.[0]?.images?.[0]?.url || "/placeholder.svg";

            return (
              <section key={sec.id} className="wahaj-hero">
                <div className="wahaj-hero__ornament" aria-hidden="true" />
                <div className="wahaj-hero__inner">
                  <div className="wahaj-hero__content">
                    <span className="wahaj-hero__eyebrow">
                      {sec.badge || "وَهَج — تفاصيل تصنع الفرق"}
                    </span>
                    <h1 className="wahaj-hero__title">
                      {sec.title || "لأن أناقتك تستحق أن تتألّق"}
                    </h1>
                    <p className="wahaj-hero__description">
                      {sec.subtitle ||
                        "قطع مختارة بعناية لتضيف لمسة من الوهج والفخامة إلى كل إطلالة."}
                    </p>
                    <div className="wahaj-hero__actions">
                      <a href={sec.ctaUrl || "/shop"} className="wahaj-hero__primary">
                        {sec.ctaText || "اكتشفي المجموعة"}
                        <ChevronLeft size={18} />
                      </a>
                      <a href="/shop" className="wahaj-hero__secondary">
                        تسوقي الآن
                        <ArrowLeft size={16} />
                      </a>
                    </div>
                    <div className="wahaj-hero__meta">
                      <span><Check size={14} /> مختارات بعناية</span>
                      <span><Check size={14} /> جودة تليق بك</span>
                      <span><Check size={14} /> تجربة تسوق راقية</span>
                    </div>
                  </div>

                  <div className="wahaj-hero__visual">
                    <Image
                      src={image}
                      alt="مجموعة وَهَج"
                      fill
                      sizes="(max-width: 800px) 100vw, 50vw"
                      priority
                      className="wahaj-hero__image"
                    />
                    <div className="wahaj-hero__frame" aria-hidden="true" />
                    <div className="wahaj-hero__badge">
                      <Sparkles size={14} />
                      <span>مصممة لتبقى في الذاكرة</span>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (sec.type === "story" || sec.type === "brandStory") {
            return (
              <section key={sec.id} className="wahaj-story">
                <div className="wahaj-story__glow" aria-hidden="true" />
                <div className="container">
                  <div className="wahaj-story__inner">
                    <div className="wahaj-story__mark" aria-hidden="true">و</div>
                    <SectionHeading
                      eyebrow="قصة وَهَج"
                      title={sec.title || "تفاصيل صغيرة تصنع وهجًا كبيرًا."}
                      subtitle={
                        sec.subtitle ||
                        s.brand_story ||
                        "نؤمن بأن الجمال الحقيقي يكمن في التفاصيل الدقيقة التي تعكس شخصيتك الفريدة."
                      }
                    />
                    <div className="wahaj-story__line" aria-hidden="true" />
                    <a href={sec.ctaUrl || "/about"} className="wahaj-story__link">
                      تعرّفي على قصة وَهَج
                      <ArrowLeft size={16} />
                    </a>
                  </div>
                </div>
              </section>
            );
          }

          if (sec.type === "collections" || sec.type === "categories") {
            return (
              <section id="collections" key={sec.id} className="wahaj-collections">
                <div className="container">
                  <SectionHeading
                    eyebrow={sec.eyebrow || "اكتشفي عالم وَهَج"}
                    title={sec.title || "اختاري ما يشبهك"}
                    subtitle={
                      sec.subtitle ||
                      sec.description ||
                      "مجموعات مختارة بعناية لتمنح كل إطلالة لمستها الخاصة من الرقي والفخامة."
                    }
                  />
                  <div className="wahaj-collections__grid">
                    {categories.map((c: any, index: number) => (
                      <a
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        className="wahaj-collection"
                      >
                        <Image
                          src={c.imageUrl || data?.products?.[0]?.images?.[0]?.url || "/placeholder.svg"}
                          alt={c.name}
                          fill
                          sizes="(max-width: 520px) 50vw, (max-width: 900px) 50vw, 25vw"
                          className="wahaj-collection__image"
                        />
                        <span className="wahaj-collection__shade" aria-hidden="true" />
                        <span className="wahaj-collection__number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="wahaj-collection__content">
                          <span className="wahaj-collection__name">{c.name}</span>
                          <span className="wahaj-collection__link">
                            اكتشفي المجموعة
                            <ChevronLeft size={15} />
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (sec.type === "products" || sec.type === "featured") {
            return (
              <ProductsSection
                key={sec.id}
                data={data}
                title={sec.title || "الأكثر تألقًا"}
                subtitle={sec.subtitle || "اختيارات وَهَج"}
              />
            );
          }

          if (sec.type === "offers") {
            return (
              <section id="offers" key={sec.id} className="wahaj-offers">
                <div className="container">
                  <div className="wahaj-offers__shell">
                    <div className="wahaj-offers__head">
                      <SectionHeading
                        eyebrow={sec.eyebrow || "عروض مختارة"}
                        title={sec.title || "لمعتك تبدأ من التفاصيل"}
                        subtitle={
                          sec.subtitle ||
                          sec.description ||
                          "فرص مختارة لفترة محدودة، بتفاصيل تمنحك قيمة وأناقة في الوقت نفسه."
                        }
                        align="right"
                      />
                      <a href="/offers" className="wahaj-offers__all">
                        كل العروض <ArrowLeft size={15} />
                      </a>
                    </div>

                    <div className="wahaj-offers__grid">
                      {offers.slice(0, 3).map((o: any, index: number) => {
                        const value = o.discountValue === null || o.discountValue === undefined
                          ? null
                          : Number(o.discountValue);
                        const discountLabel =
                          o.type === "FREE_SHIPPING"
                            ? "شحن مجاني"
                            : o.type === "BUY_X_GET_Y"
                              ? `اشترِ ${Number(o.buyQuantity || 0).toLocaleString("ar-EG")} واحصلي على ${Number(o.getQuantity || 0).toLocaleString("ar-EG")}`
                              : value !== null
                                ? `${o.discountType === "FIXED" ? "خصم" : "خصم"} ${value.toLocaleString("ar-EG")}${o.discountType === "FIXED" ? " ج.م" : "%"}`
                                : "عرض خاص لفترة محدودة";

                        return (
                          <Link key={o.id} href={`/offers/${o.id}`} className="wahaj-offer-card">
                            <span className="wahaj-offer-card__number">0{index + 1}</span>
                            <span className="wahaj-offer-card__icon" aria-hidden="true"><Sparkles size={17} /></span>
                            <span className="wahaj-offer-card__body">
                              <span className="wahaj-offer-card__eyebrow">عرض مختار</span>
                              <span className="wahaj-offer-card__title">{o.name}</span>
                              <span className="wahaj-offer-card__discount">{discountLabel}</span>
                              <span className="wahaj-offer-card__cta">اكتشفي العرض <ArrowLeft size={14} /></span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (sec.type === "trust") {
            const items = [
              { icon: Truck, title: "شحن داخل مصر", desc: "توصيل سريع لكافة المحافظات", href: "/policies/shipping" },
              { icon: ShieldCheck, title: "دفع آمن ومتعدد", desc: "طرق دفع تناسب احتياجاتك", href: "/payment-policy" },
              { icon: RotateCcw, title: "استبدال واسترجاع", desc: "سياسة مرنة خلال 14 يومًا", href: "/policies/returns" },
              { icon: MessageCircle, title: "دعم سريع", desc: "نحن هنا لمساعدتك دائمًا", href: "/contact" },
            ];

            return (
              <section key={sec.id} className="wahaj-trust">
                <div className="container">
                  <div className="wahaj-trust__intro">
                    <span>وَهَج</span>
                    <p>تجربة راقية من أول اختيار حتى وصول طلبك.</p>
                  </div>
                  <div className="wahaj-trust__grid">
                    {items.map(({ icon: Icon, title, desc, href }) => (
                      <a href={href} key={title} className="wahaj-trust__item">
                        <span className="wahaj-trust__icon"><Icon size={20} strokeWidth={1.6} /></span>
                        <span className="wahaj-trust__copy">
                          <span className="wahaj-trust__title">{title}</span>
                          <span className="wahaj-trust__text">{desc}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          return (
            <section key={sec.id} className="wahaj-fallback-section">
              <div className="container">
                <div className="wahaj-fallback-section__card">
                  <SectionHeading
                    eyebrow="وَهَج"
                    title={sec.title || "تفاصيل تستحق أن تُرى"}
                    subtitle={sec.subtitle}
                  />
                  {sec.imageUrl ? (
                    <Image
                      src={sec.imageUrl}
                      alt={sec.title || "وَهَج"}
                      width={1200}
                      height={800}
                      sizes="(max-width: 900px) 100vw, 50vw"
                    />
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

