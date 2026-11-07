import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProductGallery from '@/components/ProductGallery';
import ProductPurchase from '@/components/ProductPurchase';
import ProductDetailsAccordion from '@/components/ProductDetailsAccordion';
import WishlistButton from '@/components/WishlistButton';
import ClientRecentTracker from '@/components/ClientRecentTracker';
import {
  ProductRelatedSection,
  ProductReviewSection,
  ProductReviewSummary,
  ProductStructuredData,
} from '@/components/product/ProductAsyncSections';

const BackInStockForm = dynamic(() => import('@/components/BackInStockForm'), { ssr: true });
const RecentlyViewed = dynamic(() => import('@/components/RecentlyViewed'), { ssr: true });

export const revalidate = 60;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app').replace(/\/+$/, '');

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
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

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const [product, payments] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: true,
      },
    }),
    prisma.paymentSetting.findMany({ where: { enabled: true } }),
  ]);

  if (!product || product.status !== 'PUBLISHED') notFound();

  const price = Number(product.price);
  const mainImage = product.images[0]?.url || '/placeholder.svg';
  const availablePayments = paymentOptions.filter((option) =>
    payments.some((payment) => payment.method === option.method),
  );

  const productUrl = `${SITE_URL}/product/${encodeURIComponent(product.slug)}`;
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
      <Suspense fallback={null}>
        <ProductStructuredData
          productId={product.id}
          productName={product.name}
          description={product.description}
          sku={product.sku}
          imageUrls={product.images.map((image) => image.url)}
          price={price}
          stock={product.stock}
          productUrl={productUrl}
        />
      </Suspense>
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
            <div className="wahaj-product-purchase-panel">
              <div className="wahaj-product-panel-heading">
                <div className="wahaj-product-title-row">
                  <div className="wahaj-product-title-copy">
                    <h1 id="product-title">{product.name}</h1>
                    <Suspense fallback={<div className="wahaj-product-rating" aria-hidden="true" style={{ minHeight: 18 }} />}>
                      <ProductReviewSummary productId={product.id} productName={product.name} />
                    </Suspense>
                  </div>
                  <div className="wahaj-product-wishlist" aria-label="حفظ المنتج في المفضلة">
                    <WishlistButton productId={product.id} />
                  </div>
                </div>
              </div>
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
            <ProductDetailsAccordion
              productName={product.name}
              description={product.description}
              material={product.material}
              careInstructions={product.careInstructions}
            />
            <div className="wahaj-product-specs__note"><Check size={15} /> تفاصيل المنتج ومعلوماته محدثة من متجر وَهَج.</div>
          </article>

          <Suspense fallback={null}>
            <ProductReviewSection productId={product.id} />
          </Suspense>
        </section>

        <Suspense fallback={null}>
          <ProductRelatedSection productId={product.id} />
        </Suspense>

        <RecentlyViewed products={[product]} />
      </div>
    </main>
  );
}
