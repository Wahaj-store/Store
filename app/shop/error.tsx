'use client';

import { RefreshCw } from 'lucide-react';

export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wahaj-shop-redesign" dir="rtl">
      <section className="wahaj-shop-empty wahaj-shop-error" role="alert" aria-live="assertive">
        <span className="wahaj-shop-empty__icon"><RefreshCw size={27} aria-hidden="true" /></span>
        <span className="wahaj-shop-section-kicker"><span>تعذّر التحميل</span></span>
        <h1>لم نتمكن من تحميل المنتجات الآن</h1>
        <p>حدثت مشكلة مؤقتة أثناء جلب التشكيلة. حاولي مرة أخرى دون فقدان اختياراتك.</p>
        <button type="button" onClick={reset} className="wahaj-shop-empty__action">
          إعادة المحاولة <RefreshCw size={15} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
