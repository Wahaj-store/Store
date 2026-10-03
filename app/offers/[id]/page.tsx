import Link from "next/link";
import { ArrowLeft, Check, Clock3, Gift, Sparkles, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(value);
}

export default async function OfferDetailsPage({ params }: { params: { id: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      category: true,
    },
  });

  if (!offer) notFound();

  const now = new Date();
  const starts = !offer.startsAt || offer.startsAt <= now;
  const ends = !offer.endsAt || offer.endsAt >= now;
  const active = offer.active && starts && ends;
  const value = offer.discountValue === null ? null : Number(offer.discountValue);
  const isShipping = offer.type === "FREE_SHIPPING";
  const isGift = offer.type === "BUY_X_GET_Y";
  const label = isShipping
    ? "شحن مجاني"
    : isGift
      ? `اشترِ ${Number(offer.buyQuantity || 0).toLocaleString("ar-EG")} واحصلي على ${Number(offer.getQuantity || 0).toLocaleString("ar-EG")}`
      : value === null
        ? "عرض خاص"
        : `${value.toLocaleString("ar-EG")}${offer.discountType === "FIXED" ? " ج.م" : "%"} خصم`;
  const image = offer.product?.images?.[0]?.url || offer.category?.imageUrl || "/placeholder.svg";

  return (
    <main className="wahaj-offer-detail" dir="rtl">
      <div className="container">
        <div className="wahaj-offer-detail__crumbs">
          <Link href="/offers">كل العروض</Link><ArrowLeft size={13} /><span>{offer.name}</span>
        </div>

        <section className="wahaj-offer-detail__card">
          <div className="wahaj-offer-detail__visual">
            <img src={image} alt={offer.product?.name || offer.category?.name || offer.name} />
            <span className="wahaj-offer-detail__badge">{active ? "متاح الآن" : "انتهى العرض"}</span>
          </div>

          <div className="wahaj-offer-detail__content">
            <span className="wahaj-offer-detail__eyebrow"><Sparkles size={14} /> عرض مختار من وَهَج</span>
            <h1>{offer.name}</h1>
            <div className="wahaj-offer-detail__discount">{label}</div>
            <p className="wahaj-offer-detail__lead">استفيدي من هذا العرض على المنتجات المؤهلة خلال فترة سريانه، وتابعي شروط العرض الظاهرة قبل إتمام الطلب.</p>

            <div className="wahaj-offer-detail__facts">
              <div><span>الحالة</span><strong>{active ? "متاح الآن" : "غير متاح حاليًا"}</strong></div>
              {offer.minOrder ? <div><span>الحد الأدنى</span><strong>{Number(offer.minOrder).toLocaleString("ar-EG")} ج.م</strong></div> : null}
              {offer.maxDiscount ? <div><span>أقصى خصم</span><strong>{Number(offer.maxDiscount).toLocaleString("ar-EG")} ج.م</strong></div> : null}
              {offer.endsAt ? <div><span>ينتهي</span><strong>{formatDate(offer.endsAt)}</strong></div> : null}
            </div>

            <div className="wahaj-offer-detail__conditions">
              <span><Check size={15} /> يطبّق العرض وفق المنتجات والشروط المؤهلة.</span>
              {offer.product ? <span><Check size={15} /> العرض مرتبط بالمنتج: {offer.product.name}.</span> : null}
              {offer.category ? <span><Check size={15} /> العرض مرتبط بتصنيف: {offer.category.name}.</span> : null}
              {offer.type === "FIRST_ORDER" ? <span><Check size={15} /> العرض مخصص لأول طلب.</span> : null}
              {offer.stackable ? <span><Check size={15} /> يمكن دمجه مع عروض أخرى وفق قواعد التسعير.</span> : null}
            </div>

            <div className="wahaj-offer-detail__actions">
              <Link href="/shop" className="btn btn-gold">تسوّقي واستفيدي من العرض <ArrowLeft size={16} /></Link>
              <Link href="/offers" className="btn">العودة لكل العروض</Link>
            </div>

            <div className="wahaj-offer-detail__validity"><Clock3 size={15} /> {offer.startsAt ? `من ${formatDate(offer.startsAt)}` : "متاح الآن"}{offer.endsAt ? ` حتى ${formatDate(offer.endsAt)}` : ""}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
