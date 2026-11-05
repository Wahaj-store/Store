import ProductCard from './ProductCard';
import type { ShopProduct } from '@/lib/shop-data';

export default function ShopProductCard({ product, priorityImage = false }: { product: ShopProduct; priorityImage?: boolean }) {
  return (
    <ProductCard
      product={product}
      variant="shop"
      priorityImage={priorityImage}
      imageSizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 280px"
    />
  );
}
