import { revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PUBLIC_SETTING_KEYS, toPublicSettings } from '@/lib/public-settings';

export const HOMEPAGE_DATA_CACHE_TAG = 'homepage-data';

const readHomepageData = unstable_cache(
  async () => {
    const [sections, products, categories, settings, offers, reviews] = await Promise.all([
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
          config: true,
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
          variants: {
            select: { id: true, name: true, value: true, stock: true, price: true, imageUrl: true },
            orderBy: { stock: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true, slug: true, description: true, imageUrl: true, active: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.siteSetting.findMany({
        where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
        select: { key: true, value: true },
      }),
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

    return {
      sections: sections.map((section) => ({
        ...section,
        startsAt: section.startsAt?.toISOString() ?? null,
        endsAt: section.endsAt?.toISOString() ?? null,
      })),
      products: products.map((product) => ({
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice === null ? null : Number(product.comparePrice),
        variants: product.variants.map((variant) => ({
          ...variant,
          price: variant.price === null ? null : Number(variant.price),
        })),
      })),
      categories,
      settings: toPublicSettings(settings),
      offers: offers.map((offer) => ({
        ...offer,
        discountValue: offer.discountValue === null ? null : Number(offer.discountValue),
        endsAt: offer.endsAt?.toISOString() ?? null,
        createdAt: offer.createdAt.toISOString(),
      })),
      testimonials: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        verified: review.verified,
        customerName: String(review.customer.name || '').trim().split(/\s+/)[0] || 'عميلة وَهَج',
        productName: review.product.name,
        productSlug: review.product.slug,
      })),
    };
  },
  ['wahaj-homepage-data-v2'],
  { revalidate: 15, tags: [HOMEPAGE_DATA_CACHE_TAG] },
);

export function getHomepageData() {
  return readHomepageData();
}

export function revalidateHomepageData() {
  revalidateTag(HOMEPAGE_DATA_CACHE_TAG, { expire: 0 });
}
