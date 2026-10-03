import Link from "next/link";
import { ArrowLeft, Clock3, Gift, Sparkles, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function getOfferLabel(offer: any) {
  const value = offer.discountValue === null || offer.discountValue === undefined
    ? null
    : Number(offer.discountValue);

  if (offer.type === "FREE_SHIPPING") return "شحن مجاني";
  if (offer.type === "BUY_X_GET_Y") {
    return `اشترِ ${Number(offer.buyQuantity || 0).toLocaleString("ar-EG")} واحصلي على ${Number(offer.getQuantity || 0).toLocaleString("ar-EG")}`;
  }
  if (value === null) return "عرض خاص لفترة محدودة";
  return `${value.toLocaleString("ar-EG")}${offer.discountType === "FIXED" ? " ج.م" : "%"} خصم`;
}

function getOfferMeta(offer: any) {
  if (offer.type === "FREE_SHIPPING") return "توصيل مجاني وفق شروط العرض";
  if (offer.type === "FIRST_ORDER") return "متاح لأول طلب وفق الحد الأدنى إن وُجد";
  if (offer.type === "BUY_X_GET_Y") return "طبّقي العرض على المنتجات المؤهلة لإتمام الاستفادة";
  if (offer.minOrder) return `على طلبات تبدأ من ${Number(offer.minOrder).toLocaleString("ar-EG")} ج.م`;
  return "عرض لفترة محدودة من وَهَج";
}

export default async function OffersPage() {
  const now = new Date();
  const allOffers = await prisma.offer.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  const offers = allOffers.filter((offer) => offer.maxUses === null || offer.usedCount < offer.maxUses);

  return (
    <main className="wahaj-offers-page" dir="rtl">
      <section className="wahaj-offers-page__hero">
        <div className="container">
          <div className="wahaj-offers-page__hero-card">
            <span className="wahaj-offers-page__eyebrow"><Sparkles size={14} /> عروض وَهَج</span>
            <h1>عروض مختارة، بتفاصيل تستحق الاكتشاف</h1>
            <p>اكتشفي العروض المتاحة الآن واستفيدي من التفاصيل التي صممت لتمنح تجربة تسوق أكثر أناقة ووضوحًا.</p>
            <Link href="/shop" className="wahaj-offers-page__hero-link">تسوّقي الآن <ArrowLeft size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="wahaj-offers-page__list">
        <div className="container">
          <div className="wahaj-offers-page__heading">
            <div>
              <span>متاح الآن</span>
              <h2>كل العروض</h2>
            </div>
            <p>{offers.length.toLocaleString("ar-EG")} عروض متاحة حاليًا</p>
          </div>

          {offers.length ? (
            <div className="wahaj-offers-page__grid">
              {offers.map((offer, index) => {
                const start = formatDate(offer.startsAt);
                const end = formatDate(offer.endsAt);
                const isShipping = offer.type === "FREE_SHIPPING";
                const isGift = offer.type === "BUY_X_GET_Y";

                return (
                  <article key={offer.id} className="wahaj-offer-list-card">
                    <div className="wahaj-offer-list-card__top">
                      <span className="wahaj-offer-list-card__index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="wahaj-offer-list-card__icon">
                        {isShipping ? <Truck size={18} /> : isGift ? <Gift size={18} /> : <Sparkles size={18} />}
                      </span>
                      <span className="wahaj-offer-list-card__status">متاح الآن</span>
                    </div>

                    <div className="wahaj-offer-list-card__content">
                      <span className="wahaj-offer-list-card__eyebrow">عرض مختار من وَهَج</span>
                      <h3>{offer.name}</h3>
                      <strong>{getOfferLabel(offer)}</strong>
                      <p>{getOfferMeta(offer)}</p>
                    </div>

                    <div className="wahaj-offer-list-card__details">
                      <span><Clock3 size={14} /> {end ? `ينتهي ${end}` : start ? `يبدأ ${start}` : "لفترة محدودة"}</span>
                      {offer.maxDiscount ? <span>حد الخصم {Number(offer.maxDiscount).toLocaleString("ar-EG")} ج.م</span> : null}
                    </div>

                    <Link href={`/offers/${offer.id}`} className="wahaj-offer-list-card__cta">
                      اكتشفي تفاصيل العرض <ArrowLeft size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="wahaj-offers-page__empty">
              <Sparkles size={22} />
              <h3>لا توجد عروض متاحة حاليًا</h3>
              <p>تابعي وَهَج، سنضيف عروضًا جديدة فور توفرها.</p>
              <Link href="/shop" className="btn btn-gold">تسوّقي الآن</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
