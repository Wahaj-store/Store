import type { Metadata } from 'next';
import Store from '@/components/Store';
import { getHomepageData } from '@/lib/homepage-data';

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

// تعتمد الصفحة على محتوى قابل للتغيير من قاعدة البيانات؛ تُرندر وقت الطلب
// حتى لا يفشل Build أو يتم تخزين بيانات متجر قديمة داخل ناتج البناء.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { sections, products, categories, settings, offers, testimonials } = await getHomepageData();

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
          products,
          categories,
          settings,
          offers,
          testimonials,
        }}
      />
    </>
  );
}
