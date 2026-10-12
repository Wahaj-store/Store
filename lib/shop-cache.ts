import { revalidateTag } from 'next/cache';
import { SHOP_CATEGORIES_CACHE_TAG, SHOP_PRODUCTS_CACHE_TAG } from '@/lib/shop-data';

export function revalidateShopProducts() {
  revalidateTag(SHOP_PRODUCTS_CACHE_TAG);
}

export function revalidateShopCategories() {
  revalidateTag(SHOP_CATEGORIES_CACHE_TAG);
  revalidateTag(SHOP_PRODUCTS_CACHE_TAG);
}
