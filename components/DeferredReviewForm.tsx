'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const ReviewForm = dynamic(() => import('@/components/ReviewForm'), {
  ssr: false,
  loading: () => <ReviewFormPlaceholder />,
});

function ReviewFormPlaceholder() {
  return (
    <div className="wahaj-review-form-placeholder" aria-hidden="true">
      <span>نموذج إضافة التقييم</span>
      <span className="wahaj-review-form-placeholder__line" />
      <span className="wahaj-review-form-placeholder__line wahaj-review-form-placeholder__line--short" />
      <span className="wahaj-review-form-placeholder__field" />
    </div>
  );
}

export default function DeferredReviewForm({ productId }: { productId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef}>{shouldLoad ? <ReviewForm productId={productId} /> : <ReviewFormPlaceholder />}</div>;
}
