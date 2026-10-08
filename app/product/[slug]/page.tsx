import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProductGallery from '@/components/ProductGallery';
import ProductPurchase from '@/components/ProductPurchase';
import WishlistButton from '@/components/WishlistButton';
import ClientRecentTracker from '@/components/ClientRecentTracker';

const ProductCard = dynamic(() => import('@/components/ProductCard'), { ssr: true });
const ReviewForm = dynamic(() => import('@/components/ReviewForm'), { ssr: true });
const BackInStockForm = dynamic(() => import('@/components/BackInStockForm'), { ssr: true });
const RecentlyViewed = dynamic(() => import('@/components/RecentlyViewed'), { ssr: true });

export const revalidate = 60;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app').replace(/\/+$/, '');

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      seoTitle: true,
      seoDescription: true,
      description: true,
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { url: true },
      },
    },
  });

  if (!product) return {};

  const title = product.seoTitle || `${product.name} | وَهَج`;
  const description = (product.seoDescription || product.description || `اكتشفي ${product.name} من وَهَج`).slice(0, 160);
  const url = `${SITE_URL}/product/${encodeURIComponent(params.slug)}`;
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'وَهَج',
      locale: 'ar_EG',
      title: product.seoTitle || product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    robots: { index: true, follow: true },
  };
}

const paymentOptions = [
  { method: 'COD', label: 'الدفع عند الاستلام', Icon: Truck },
  { method: 'VODAFONE_CASH', label: 'فودافون كاش', Icon: CreditCard },
  { method: 'INSTAPAY', label: 'إنستا باي', Icon: ShieldCheck },
] as const;

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [product, payments] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: true,
        relationsFrom: {
          where: {
            type: { in: ['RELATED', 'COMPLEMENTARY', 'UPSELL', 'CROSS_SELL'] },
            toProduct: { status: 'PUBLISHED' },
          },
          include: {
            toProduct: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                category: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
          take: 8,
        },
        reviews: {
          where: { approved: true },
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.paymentSetting.findMany({ where: { enabled: true } }),
  ]);

  if (!product || product.status !== 'PUBLISHED') notFound();

  const price = Number(product.price);
  const mainImage = product.images[0]?.url || '/placeholder.svg';
  const reviews = product.reviews;
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const availablePayments = paymentOptions.filter((option) =>
    payments.some((payment) => payment.method === option.method),
  );

  const productUrl = `${SITE_URL}/product/${encodeURIComponent(product.slug)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.description || '',
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'وَهَج' },
    image: product.images.map((image) => image.url),
    ...(reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(averageRating.toFixed(1)), reviewCount: reviews.length, bestRating: 5, worstRating: 1 } } : {}),
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'EGP',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: productUrl,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'المتجر', item: `${SITE_URL}/shop` },
      ...(product.category ? [{ '@type': 'ListItem', position: 3, name: product.category.name, item: `${SITE_URL}/shop?category=${encodeURIComponent(product.category.slug)}` }] : []),
      { '@type': 'ListItem', position: product.category ? 4 : 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <main className="wahaj-product-page" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
      <ClientRecentTracker
        product={{ name: product.name, slug: product.slug, price, image: mainImage }}
      />

      <div className="container wahaj-product-container">
        <nav className="wahaj-product-breadcrumb" aria-label="مسار التنقل">
          <Link href="/">الرئيسية</Link>
          <ChevronLeft size={14} aria-hidden="true" />
          <Link href="/shop">المتجر</Link>
          {product.category ? (
            <>
              <ChevronLeft size={14} aria-hidden="true" />
              <Link href={`/shop?category=${encodeURIComponent(product.category.slug)}`}>
                {product.category.name}
              </Link>
            </>
          ) : null}
          <ChevronLeft size={14} aria-hidden="true" />
          <span aria-current="page">{product.name}</span>
        </nav>

        <section className="wahaj-product-hero" aria-labelledby="product-title">
          <div className="wahaj-product-visual">
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          <div className="wahaj-product-information">
            <div className="wahaj-product-eyebrow">
              <span className="wahaj-product-eyebrow__mark"><Sparkles size={14} /></span>
              <span>{product.category?.name || 'اختيارات وَهَج'}</span>
              <span className="wahaj-product-eyebrow__line" aria-hidden="true" />
            </div>

            <div className="wahaj-product-title-row">
              <div className="wahaj-product-title-copy">
                <span className="wahaj-product-title-kicker">تفاصيل صغيرة، أثر يدوم</span>
                <h1 id="product-title">{product.name}</h1>
              </div>
              <div className="wahaj-product-wishlist" aria-label="حفظ المنتج في المفضلة">
                <WishlistButton productId={product.id} />
              </div>
            </div>

            <div className="wahaj-product-rating" aria-label={reviews.length ? `متوسط التقييمات المعروضة ${averageRating.toFixed(1)} من 5` : 'لا توجد تقييمات بعد'}>
              <span className="wahaj-product-rating__stars" aria-hidden="true">
                {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
              </span>
              <span>{reviews.length ? `${averageRating.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} من 5` : 'لا توجد تقييمات بعد'}</span>
              {reviews.length ? <a href="#product-reviews">({reviews.length.toLocaleString('ar-EG')} تقييمات معتمدة معروضة)</a> : null}
            </div>

            {product.sku ? (
              <div className="wahaj-product-sku">رمز المنتج <b dir="ltr">{product.sku}</b></div>
            ) : null}

            {product.description ? <p className="wahaj-product-lead">{product.description}</p> : null}

            <div className="wahaj-product-purchase-panel">
              <ProductPurchase product={{ ...product, price, images: product.images }} />
            </div>

            {product.stock <= 0 ? <BackInStockForm productId={product.id} /> : null}

            <div className="wahaj-product-payments" aria-labelledby="product-payment-title">
              <div className="wahaj-product-payments__heading">
                <span className="wahaj-product-payments__icon"><ShieldCheck size={16} /></span>
                <div>
                  <b id="product-payment-title">طرق الدفع والشحن</b>
                  <small>خيارات واضحة من لحظة الطلب حتى الاستلام</small>
                </div>
              </div>

              {availablePayments.length ? (
                <div className="wahaj-product-payments__list" aria-label="طرق الدفع المتاحة">
                  {availablePayments.map(({ method, label, Icon }) => (
                    <div className="wahaj-product-payment" key={method}>
                      <Icon size={17} aria-hidden="true" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="wahaj-product-payments__empty">تظهر طرق الدفع المتاحة عند إتمام الطلب.</p>
              )}

              <div className="wahaj-product-policy-list">
                <Link href="/policies/shipping" className="wahaj-product-policy">
                  <span className="wahaj-product-policy__icon"><Truck size={16} /></span>
                  <span className="wahaj-product-policy__copy">
                    <b>الشحن والاستبدال</b>
                    <small>توصيل آمن وتعليمات الاستبدال بالتفصيل</small>
                  </span>
                  <ArrowLeft size={14} aria-hidden="true" />
                </Link>
                <Link href="/payment-policy" className="wahaj-product-policy">
                  <span className="wahaj-product-policy__icon"><RotateCcw size={16} /></span>
                  <span className="wahaj-product-policy__copy">
                    <b>سياسة الدفع</b>
                    <small>راجعي طرق الدفع والشروط قبل التأكيد</small>
                  </span>
                  <ArrowLeft size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="wahaj-product-lower-grid" aria-label="معلومات المنتج وتقييماته">
          <article className="wahaj-product-specs">
            <div className="wahaj-product-section-heading">
              <span className="wahaj-product-section-heading__icon"><PackageCheck size={18} /></span>
              <div>
                <span>تفاصيل وَهَج</span>
                <h2>صُنعت لترافقكِ</h2>
              </div>
            </div>
            {product.description ? <p className="wahaj-product-specs__description">{product.description}</p> : null}
            <dl className="wahaj-product-spec-list">
              <div>
                <dt>الخامة</dt>
                <dd>{product.material || 'مختارة بعناية فائقة'}</dd>
              </div>
              <div>
                <dt>العناية</dt>
                <dd>{product.careInstructions || 'يُحفظ بعيدًا عن الرطوبة والعطور المباشرة.'}</dd>
              </div>
              <div>
                <dt>رمز المنتج</dt>
                <dd dir="ltr">{product.sku || 'غير متوفر'}</dd>
              </div>
            </dl>
            <div className="wahaj-product-specs__note"><Check size={15} /> تفاصيل المنتج ومعلوماته محدثة من متجر وَهَج.</div>
          </article>

          <section className="wahaj-product-reviews" id="product-reviews" aria-labelledby="reviews-title">
            <div className="wahaj-product-section-heading">
              <span className="wahaj-product-section-heading__icon wahaj-product-section-heading__icon--star">★</span>
              <div>
                <span>تجارب عميلاتنا</span>
                <h2 id="reviews-title">تقييمات المنتج</h2>
              </div>
              <span className="wahaj-product-reviews__count">{reviews.length.toLocaleString('ar-EG')}</span>
            </div>

            {reviews.length ? (
              <div className="wahaj-product-review-list">
                {reviews.map((review) => {
                  const reviewer = String(review.customer?.name || '').trim().split(/\s+/)[0] || 'عميلة وَهَج';
                  return (
                    <article className="wahaj-product-review" key={review.id}>
                      <div className="wahaj-product-review__top">
                        <div className="wahaj-product-review__customer">
                          <span className="wahaj-product-review__avatar" aria-hidden="true">{reviewer.slice(0, 1)}</span>
                          <div><b>{reviewer}</b><small>تقييم معتمد</small></div>
                        </div>
                        <span className="wahaj-product-review__stars" aria-label={`${review.rating} من 5 نجوم`}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}
                        </span>
                      </div>
                      {review.text ? <p>{review.text}</p> : <p className="wahaj-product-review__empty">شاركت العميلة تقييمها للمنتج.</p>}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="wahaj-product-review-empty">لم تُضف تقييمات لهذا المنتج بعد. يسعدنا أن تكوني أول من يشارك تجربته.</p>
            )}

            <ReviewForm productId={product.id} />
          </section>
        </section>

        {product.relationsFrom.length ? (
          <section className="wahaj-product-related" aria-labelledby="related-products-title">
            <div className="wahaj-product-related__heading">
              <div>
                <span className="wahaj-product-section-heading__eyebrow">اختيارات تكمل إطلالتك</span>
                <h2 id="related-products-title">قد يعجبكِ أيضًا</h2>
              </div>
              <Link href="/shop">اكتشفي المتجر <ArrowLeft size={15} /></Link>
            </div>
            <div className="wahaj-product-related__grid">
              {product.relationsFrom.map((relation) => (
                <ProductCard key={relation.id} product={relation.toProduct} variant="shop" />
              ))}
            </div>
          </section>
        ) : null}

        <RecentlyViewed products={[product]} />
      </div>
    </main>
  );
}
