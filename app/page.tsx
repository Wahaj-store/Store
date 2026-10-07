import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Store from '@/components/Store';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app').replace(/\/+$/, '');
const SITE_NAME = 'وَهَج';
const HOME_TITLE = 'وَهَج | إكسسوارات نسائية راقية بتفاصيل فريدة';
const HOME_DESCRIPTION = 'تسوّقي إكسسوارات وَهَج النسائية المختارة بعناية؛ أساور وسلاسل وخواتم بتفاصيل راقية، مع توصيل إلى جميع محافظات مصر.';

const shareImage = `${SITE_URL}/images/wahaj.logo.png`;

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: ['إكسسوارات نسائية', 'متجر إكسسوارات', 'أساور', 'سلاسل', 'خواتم'],
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: shareImage, width: 278, height: 284, alt: 'شعار متجر وَهَج' }],
  },
  twitter: {
    card: 'summary',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [shareImage],
  },
  robots: { index: true, follow: true },
};

export const revalidate = 0; // إبقاء بيانات الصفحة الرئيسية محدثة فورًا

export default async function Page() {
  // جلب البيانات المعروضة فقط بالتوازي، مع إبقاء المحتوى محدثًا فورًا.
  const [sections, products, categories, settings, offers, testimonials] = await Promise.all([
    prisma.homepageSection.findMany({
      where: { visible: true },
      select: {
        id: true,
        type: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        ctaText: true,
        ctaUrl: true,
        visible: true,
        sortOrder: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        price: true,
        comparePrice: true,
        stock: true,
        newArrival: true,
        bestSeller: true,
        images: {
          select: { url: true, alt: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        category: { select: { name: true } },
        // بطاقة الرئيسية تحتاج معرفة وجود متغيرات فقط لتعطيل الإضافة المباشرة.
        variants: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, imageUrl: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSetting.findMany({ select: { key: true, value: true } }),
    prisma.offer.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true, discountType: true, discountValue: true, endsAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { approved: true, text: { not: null }, product: { is: { status: 'PUBLISHED' } } },
      select: {
        id: true,
        rating: true,
        text: true,
        verified: true,
        customer: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': `${SITE_URL}/#store`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: shareImage,
        image: shareImage,
        description: HOME_DESCRIPTION,
        areaServed: { '@type': 'Country', name: 'مصر' },
        currenciesAccepted: 'EGP',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: 'ar-EG',
        publisher: { '@id': `${SITE_URL}/#store` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/shop?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <Store
        data={{
          sections,
          products: products.map((p) => ({
            ...p,
            price: Number(p.price),
            comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          })),
          categories,
          settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
          offers,
          testimonials: testimonials.map((review) => ({
            id: review.id,
            rating: review.rating,
            text: review.text,
            verified: review.verified,
            customerName: String(review.customer.name || '').trim().split(/\s+/)[0] || 'عميلة وَهَج',
            productName: review.product.name,
            productSlug: review.product.slug,
          })),
        }}
      />
    </>
  );
}
