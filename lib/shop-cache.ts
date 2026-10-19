import { revalidateTag } from 'next/cache';
import { SHOP_CATEGORIES_CACHE_TAG, SHOP_PRODUCTS_CACHE_TAG } from '@/lib/shop-data';
import { revalidateHomepageData } from '@/lib/homepage-data';

export function revalidateShopProducts() {
  revalidateTag(SHOP_PRODUCTS_CACHE_TAG, { expire: 0 });
  revalidateHomepageData();
}

export function revalidateShopCategories() {
  revalidateTag(SHOP_CATEGORIES_CACHE_TAG, { expire: 0 });
  revalidateTag(SHOP_PRODUCTS_CACHE_TAG, { expire: 0 });
  revalidateHomepageData();
}
