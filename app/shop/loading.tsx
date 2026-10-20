export default function ShopLoading() {
  return (
    <main className="wahaj-shop-redesign" dir="rtl" aria-busy="true" aria-label="جارٍ تحميل المتجر">
      <section className="wahaj-shop-hero wahaj-shop-hero--loading" aria-hidden="true">
        <div className="wahaj-shop-hero__layout">
          <div className="wahaj-shop-hero__copy">
            <span className="wahaj-shop-heading-skeleton" />
            <span className="wahaj-shop-heading-skeleton wahaj-shop-heading-skeleton--wide" />
            <span className="wahaj-shop-heading-skeleton wahaj-shop-heading-skeleton--short" />
          </div>
          <aside className="wahaj-shop-hero__aside"><span className="wahaj-shop-count-skeleton" /></aside>
        </div>
      </section>
      <section className="wahaj-shop-catalog">
        <div className="wahaj-shop-catalog__heading wahaj-shop-stream-heading" aria-hidden="true">
          <div className="wahaj-shop-heading-skeleton" />
          <div className="wahaj-shop-count-skeleton" />
        </div>
        <div className="wahaj-shop-product-grid wahaj-shop-product-grid--loading">
          {Array.from({ length: 12 }, (_, index) => (
            <div className="wahaj-shop-product-skeleton" key={index}><span /><i /><i /><b /></div>
          ))}
        </div>
      </section>
    </main>
  );
}
