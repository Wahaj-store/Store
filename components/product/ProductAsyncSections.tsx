import 'server-only';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { cache } from 'react';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import DeferredReviewForm from '@/components/DeferredReviewForm';
import FeatureFlagGate from '@/components/FeatureFlagGate';

const ProductCard = dynamic(() => import('@/components/ProductCard'), { ssr: true });

const getApprovedReviews = cache((productId: string) =>
  prisma.review.findMany({
    where: { productId, approved: true },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }),
);

type ProductReviewSummaryProps = {
  productId: string;
  productName: string;
};

export async function ProductReviewSummary({ productId, productName }: ProductReviewSummaryProps) {
  const reviews = await getApprovedReviews(productId);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="wahaj-product-rating" aria-label={reviews.length ? `متوسط التقييمات المعروضة ${averageRating.toFixed(1)} من 5` : `لا توجد تقييمات بعد لـ${productName}`}>
      <span className="wahaj-product-rating__stars" aria-hidden="true">
        {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
      </span>
      <span>{reviews.length ? `${averageRating.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} من 5` : 'لا توجد تقييمات بعد'}</span>
      {reviews.length ? <a href="#product-reviews">({reviews.length.toLocaleString('ar-EG')} تقييمات معتمدة معروضة)</a> : null}
    </div>
  );
}

export async function ProductReviewSection({ productId }: { productId: string }) {
  const reviews = await getApprovedReviews(productId);

  return (
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

      <DeferredReviewForm productId={productId} />
    </section>
  );
}

type ProductStructuredDataProps = {
  productId: string;
  productName: string;
  description: string | null;
  sku: string;
  imageUrls: string[];
  price: number;
  stock: number;
  productUrl: string;
};

export async function ProductStructuredData({
  productId,
  productName,
  description,
  sku,
  imageUrls,
  price,
  stock,
  productUrl,
}: ProductStructuredDataProps) {
  const reviews = await getApprovedReviews(productId);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: productName,
    description: description || '',
    sku,
    brand: { '@type': 'Brand', name: 'وَهَج' },
    image: imageUrls,
    ...(reviews.length ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(averageRating.toFixed(1)),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'EGP',
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: productUrl,
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />;
}

export async function ProductRelatedSection({ productId }: { productId: string }) {
  const relations = await prisma.productRelation.findMany({
    where: {
      fromProductId: productId,
      type: { in: ['RELATED', 'COMPLEMENTARY', 'UPSELL', 'CROSS_SELL'] },
      toProduct: { status: 'PUBLISHED' },
    },
    include: {
      toProduct: {
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: true,
          variants: {
            select: { id: true, name: true, value: true, stock: true, price: true, imageUrl: true },
            orderBy: { stock: 'desc' },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
    take: 8,
  });

  if (!relations.length) return null;

  return (
    <FeatureFlagGate flag="smart_recommendations">
      <section className="wahaj-product-related" aria-labelledby="related-products-title">
        <div className="wahaj-product-related__heading">
          <div>
            <span className="wahaj-product-section-heading__eyebrow">اختيارات تكمل إطلالتك</span>
            <h2 id="related-products-title">قد يعجبكِ أيضًا</h2>
          </div>
          <Link href="/shop">اكتشفي المتجر <ArrowLeft size={15} /></Link>
        </div>
        <div className="wahaj-product-related__grid">
          {relations.map((relation) => (
            <ProductCard key={relation.id} product={relation.toProduct} variant="shop" />
          ))}
        </div>
      </section>
    </FeatureFlagGate>
  );
}
