'use client';

import { useEffect } from 'react';

export default function ClientRecentTracker({ product }: { product: any }) {
  useEffect(() => {
    if (product && product.slug) {
      const existing = JSON.parse(localStorage.getItem('wahaj_recent_products') || '[]');
      const filtered = existing.filter((p: any) => p.slug !== product.slug);
      const updated = [product, ...filtered].slice(0, 6);
      localStorage.setItem('wahaj_recent_products', JSON.stringify(updated));
    }
  }, [product]);

  return null;
}
