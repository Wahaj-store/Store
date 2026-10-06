import { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app').replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/admin', '/api/customer', '/api/checkout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
