"use client";

import {
  ArrowLeft, ArrowUpLeft, ChevronLeft, Check, CheckCircle2, Facebook, Heart, Instagram, Mail, MessageCircle, Music2, Quote, RotateCcw, Send, ShieldCheck, Sparkles, Star, Truck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
const ProductCard = dynamic(() => import("../ProductCard"), {
  ssr: true,
  loading: () => <div className="wahaj-product-card wahaj-product-card--loading" aria-hidden="true" />,
});
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

function ReviewCards({ section, reviews }: { section: any; reviews: any[] }) {
  const published = Array.isArray(reviews)
    ? reviews.filter(review => typeof review?.text === "string" && review.text.trim()).slice(0, 3)
    : [];

  return (
    <section className="wahaj-testimonials">
      <div className="container">
        <div className="wahaj-testimonials__heading">
          <SectionHeading
            eyebrow="تجارب من القلب"
            title={section.title || "ماذا تقول عميلات وَهَج؟"}
            subtitle={section.subtitle || "كل حكاية جميلة تبدأ بتفصيلة اختارتها صاحبتها."}
          />
          <span className="wahaj-testimonials__count"><Heart size={14} /> آراء عميلاتنا</span>
        </div>

        {published.length ? (
          <div className="wahaj-testimonials__grid">
            {published.map((review, index) => {
              const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
              const reviewerName = String(review.customerName || "عميلة وَهَج").trim().split(/\s+/)[0] || "عميلة وَهَج";
              return (
                <article className="wahaj-testimonial-card" key={review.id || `${reviewerName}-${index}`}>
                  <div className="wahaj-testimonial-card__top">
                    <span className="wahaj-testimonial-card__quote"><Quote size={17} fill="currentColor" /></span>
                    <span className="wahaj-testimonial-card__stars" aria-label={`تقييم ${rating} من 5`}>
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star key={starIndex} size={13} fill={starIndex < rating ? "currentColor" : "none"} />
                      ))}
                    </span>
                  </div>
                  <p className="wahaj-testimonial-card__text">“{review.text}”</p>
                  <div className="wahaj-testimonial-card__footer">
                    <span className="wahaj-testimonial-card__avatar" aria-hidden="true">{reviewerName.slice(0, 1)}</span>
                    <span className="wahaj-testimonial-card__identity">
                      <b>{reviewerName}</b>
                      <small>{review.verified ? <><CheckCircle2 size={12} /> شراء موثّق</> : "من عميلات وَهَج"}</small>
                    </span>
                    {review.productSlug ? (
                      <a className="wahaj-testimonial-card__product" href={`/product/${review.productSlug}`} aria-label={`اكتشفي ${review.productName || "المنتج"}`}>
                        <ArrowUpLeft size={15} />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="wahaj-testimonials__empty">
            <span><Heart size={20} /></span>
            <b>حكايتكِ قد تكون التالية</b>
            <p>ننتظر رأيكِ بعد تجربتكِ لقطعتك المفضلة من وَهَج.</p>
            <a href="/shop">اكتشفي المتجر <ArrowLeft size={14} /></a>
          </div>
        )}
      </div>
    </section>
  );
}

type SocialNetwork = "instagram" | "facebook" | "tiktok";

function socialProfileUrl(value: unknown, network: SocialNetwork): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  const knownProfile = /^(https?:\/\/)?(www\.)?(instagram\.com|facebook\.com|tiktok\.com)\//i.test(input);
  const isHandle = /^@?[\w.]+$/.test(input) && !knownProfile && !/^https?:\/\//i.test(input) && !/^www\./i.test(input);
  const handle = input.replace(/^@/, "");
  const profile = network === "instagram"
    ? `https://www.instagram.com/${handle}/`
    : network === "tiktok"
      ? `https://www.tiktok.com/@${handle}`
      : `https://www.facebook.com/${handle}`;
  try {
    const url = new URL(isHandle ? profile : /^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowedHosts: Record<SocialNetwork, string[]> = {
      instagram: ["instagram.com"],
      facebook: ["facebook.com", "fb.com"],
      tiktok: ["tiktok.com"],
    };
    return (url.protocol === "https:" || url.protocol === "http:") && allowedHosts[network].some(domain => host === domain || host.endsWith(`.${domain}`))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function SocialWorldSection({ section, data }: { section: any; data: any }) {
  const products = Array.isArray(data?.products) ? data.products : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const tiles = products
    .filter((product: any) => product?.images?.some((image: any) => image?.url))
    .slice(0, 5)
    .map((product: any) => ({
      id: product.id,
      name: product.name,
      image: product.images.find((image: any) => image?.url)?.url,
      href: product.slug ? `/product/${product.slug}` : "/shop",
    }));
  if (!tiles.length) {
    categories.filter((category: any) => category?.imageUrl).slice(0, 5).forEach((category: any) => {
      tiles.push({ id: category.id, name: category.name, image: category.imageUrl, href: `/shop?category=${encodeURIComponent(category.slug || "")}` });
    });
  }

  const settings = data?.settings || {};
  const socialNetworks: { key: SocialNetwork; name: string; value: unknown; icon: typeof Instagram }[] = [
    { key: "instagram", name: "إنستجرام", value: settings.social_instagram, icon: Instagram },
    { key: "facebook", name: "فيسبوك", value: settings.social_facebook, icon: Facebook },
    { key: "tiktok", name: "تيك توك", value: settings.social_tiktok, icon: Music2 },
  ];
  const socialLinks = socialNetworks.map(network => ({ ...network, value: socialProfileUrl(network.value, network.key) }));

  return (
    <section className="wahaj-social-world">
      <div className="container">
        <div className="wahaj-social-world__head">
          <SectionHeading
            eyebrow="لمحات من وَهَج"
            title={section.title || "من عالم وَهَج"}
            subtitle={section.subtitle || "إلهام يومي من تفاصيلنا وقطع صُممت لترافق حكايتك."}
            align="right"
          />
          <span className="wahaj-social-world__seal"><Sparkles size={15} /> تفاصيل تُشبهك</span>
        </div>

        {tiles.length ? (
          <div className="wahaj-social-world__grid">
            {tiles.map((tile: any, index: number) => (
              <a href={tile.href} className={`wahaj-social-tile wahaj-social-tile--${index + 1}`} key={tile.id}>
                <Image src={tile.image} alt={tile.name || "من مجموعة وَهَج"} fill sizes="(max-width:700px) 45vw, 22vw" />
                <span className="wahaj-social-tile__shade" aria-hidden="true" />
                <span className="wahaj-social-tile__label"><b>{tile.name}</b><ArrowUpLeft size={16} /></span>
              </a>
            ))}
          </div>
        ) : (
          <div className="wahaj-social-world__empty"><Sparkles size={20} /><span>نحضّر لكِ إلهامًا جديدًا من عالم وَهَج.</span></div>
        )}

        <div className="wahaj-social-world__bottom">
          <p>تابعينا لتكوني أقرب إلى كل جديد.</p>
          <div className="wahaj-social-world__links" aria-label="حسابات وَهَج الرسمية">
            {socialLinks.filter(item => typeof item.value === "string").map(({ key, name, value, icon: Icon }) => (
              <a href={value as string} key={key} target="_blank" rel="noopener noreferrer" aria-label={`تابعي وَهَج على ${name}`}>
                <Icon size={16} strokeWidth={1.8} /><span>{name}</span><ArrowUpLeft size={12} />
              </a>
            ))}
            {!socialLinks.some(item => typeof item.value === "string") && <a href="/shop">تصفّحي المتجر <ArrowLeft size={14} /></a>}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ section }: { section: any }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const messageId = `wahaj-newsletter-message-${section.id || "homepage"}`;

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذّر إتمام الاشتراك الآن.");
      setStatus("success");
      setMessage("تم تسجيل بريدك الإلكتروني في قائمة وَهَج.");
      setEmail("");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "حدث خطأ أثناء الاشتراك. حاولي مرة أخرى.");
    }
  }

  const configuredSubtitle = String(section.subtitle || "").trim();
  const subtitle = /آخر العروض والمجموعات الجديدة/.test(configuredSubtitle)
    ? "سجّلي بريدك الإلكتروني للانضمام إلى قائمة وَهَج."
    : configuredSubtitle || "انضمي إلى قائمة وَهَج البريدية وسجّلي بريدك لمتابعة جديد المتجر.";

  return (
    <section className="wahaj-newsletter">
      <div className="container">
        <div className="wahaj-newsletter__card">
          <div className="wahaj-newsletter__intro">
            <div className="wahaj-newsletter__copy">
              <span className="wahaj-newsletter__eyebrow"><Sparkles size={13} /> وَهَج · القائمة البريدية</span>
              <h2>{section.title || "انضمي إلى عالم وَهَج"}</h2>
              <p>{subtitle}</p>
            </div>
            <span className="wahaj-newsletter__icon" aria-hidden="true"><Mail size={39} strokeWidth={1.25} /></span>
          </div>
          <div className="wahaj-newsletter__subscribe">
            <form className="wahaj-newsletter__form" onSubmit={subscribe}>
              <label className="wahaj-newsletter__email">
                <Mail size={17} aria-hidden="true" />
                <span className="sr-only">البريد الإلكتروني</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="بريدك الإلكتروني"
                  aria-describedby={messageId}
                  disabled={status === "loading"}
                />
              </label>
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "جارٍ التسجيل…" : section.ctaText || "انضمي إلينا"}
                {status === "loading" ? <span className="wahaj-newsletter__spinner" aria-hidden="true" /> : <Send size={15} />}
              </button>
            </form>
            <p id={messageId} className={`wahaj-newsletter__message is-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
              {message || "عند الاشتراك، يُسجّل بريدك ضمن قائمة وَهَج في قاعدة بيانات المتجر."}
            </p>
          </div>
        </div>
      </div>
    </section>
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
          <Link href="/shop" prefetch={false} className="wahaj-products-section__link">
            اكتشفي المتجر
            <ArrowLeft size={15} />
          </Link>
        </div>
        {products.length > 0 ? (
          <div className="wahaj-product-grid">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} variant="shop" />
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
                      <Link href={sec.ctaUrl || "/shop"} prefetch={false} className="wahaj-hero__primary">
                        {sec.ctaText || "اكتشفي المجموعة"}
                        <ChevronLeft size={18} />
                      </Link>
                      <Link href="/shop" prefetch={false} className="wahaj-hero__secondary">
                        تسوقي الآن
                        <ArrowLeft size={16} />
                      </Link>
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
            const storyImage = sec.imageUrl || data?.products?.find((product: any) => product?.images?.[0]?.url)?.images?.[0]?.url;
            const storyCopy = sec.subtitle || s.brand_story || "نؤمن بأن الجمال الحقيقي يكمن في التفاصيل الدقيقة التي تعكس شخصيتك الفريدة.";
            return (
              <section key={sec.id} className="wahaj-story">
                <div className="container">
                  <div className="wahaj-story__card">
                    <div className={`wahaj-story__visual${storyImage ? " has-image" : ""}`}>
                      {storyImage ? <Image src={storyImage} alt="تفاصيل من عالم وَهَج" fill sizes="(max-width:800px) 100vw, 44vw" loading="lazy" /> : <span className="wahaj-story__monogram" aria-hidden="true">و</span>}
                      <span className="wahaj-story__visual-shade" aria-hidden="true" />
                      <span className="wahaj-story__visual-caption"><Sparkles size={14} /> وَهَج — تفاصيل تصنع الفرق</span>
                    </div>
                    <div className="wahaj-story__content">
                      <span className="wahaj-story__eyebrow"><span /> حكايتنا</span>
                      <h2>{sec.title || "تفاصيل صغيرة تصنع وهجًا كبيرًا."}</h2>
                      <p>{storyCopy}</p>
                      <div className="wahaj-story__values">
                        <span><Sparkles size={15} /> قطع مختارة بعناية</span>
                        <span><Heart size={15} /> أسلوب يحمل بصمتك</span>
                      </div>
                      <a href={sec.ctaUrl || "/about"} className="wahaj-story__link">
                        {sec.ctaText || "تعرّفي على قصة وَهَج"}
                        <ArrowLeft size={16} />
                      </a>
                    </div>
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
                      <Link
                        key={c.id}
                        href={`/shop?category=${c.slug}`}
                        prefetch={false}
                        className="wahaj-collection"
                      >
                        <Image
                          src={c.imageUrl || data?.products?.[0]?.images?.[0]?.url || "/placeholder.svg"}
                          alt={c.name}
                          fill
                          sizes="(max-width: 520px) 50vw, (max-width: 900px) 50vw, 25vw"
                          className="wahaj-collection__image"
                          loading="lazy"
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
                      </Link>
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

                    {offers.length ? <div className="wahaj-offers__grid">
                      {offers.slice(0, 3).map((o: any, index: number) => {
                        const offerValue = o.type === "FREE_SHIPPING"
                          ? "شحن مجاني"
                          : o.type === "BUY_X_GET_Y"
                            ? "هدية مع مشترياتك"
                            : o.discountValue
                              ? `خصم ${Number(o.discountValue).toLocaleString("ar-EG")}${o.discountType === "FIXED" ? " ج.م" : "%"}`
                              : "عرض خاص لكِ";
                        const endDate = o.endsAt ? new Date(o.endsAt) : null;
                        const dateLabel = endDate && !Number.isNaN(endDate.getTime())
                          ? `حتى ${endDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}`
                          : "لفترة محدودة";
                        return (
                          <article key={o.id} className="wahaj-offer-card">
                            <div className="wahaj-offer-card__top">
                              <span className="wahaj-offer-card__icon"><Sparkles size={17} /></span>
                              <span className="wahaj-offer-card__number">0{index + 1} <span>· وَهَج</span></span>
                            </div>
                            <div className="wahaj-offer-card__main">
                              <span className="wahaj-offer-card__eyebrow">عرض مختار لكِ</span>
                              <h3>{o.name}</h3>
                              <p className="wahaj-offer-card__value">{offerValue}</p>
                            </div>
                            <div className="wahaj-offer-card__bottom">
                              <span className="wahaj-offer-card__expiry"><Sparkles size={12} /> {dateLabel}</span>
                              <a href={`/offers/${o.id}`} className="wahaj-offer-card__cta" aria-label={`اكتشفي العرض ${o.name}`}>
                                اكتشفي العرض <ArrowLeft size={15} />
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div> : (
                      <div className="wahaj-offers__empty">
                        <b>نحضّر لكِ عروضًا تليق باختيارك</b>
                        <p>تصفّحي مجموعات وَهَج واكتشفي قطعتك المفضلة.</p>
                        <a href="/shop">تسوّقي الآن <ArrowLeft size={14} /></a>
                      </div>
                    )}
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

          if (sec.type === "testimonials" || sec.type === "reviews") {
            return <ReviewCards key={sec.id} section={sec} reviews={data?.testimonials || []} />;
          }

          if (sec.type === "social" || sec.type === "instagram" || sec.type === "brandWorld") {
            return <SocialWorldSection key={sec.id} section={sec} data={data} />;
          }

          if (sec.type === "newsletter" || sec.type === "subscribe") {
            return <NewsletterSection key={sec.id} section={sec} />;
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
