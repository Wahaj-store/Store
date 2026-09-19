import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductPurchase from '@/components/ProductPurchase';
import WishlistButton from '@/components/WishlistButton';
import ReviewForm from '@/components/ReviewForm';
import BackInStockForm from '@/components/BackInStockForm';
import RecentlyViewed from '@/components/RecentlyViewed';
import { ShieldCheck, Truck, RotateCcw, CheckCircle2, ChevronRight } from 'lucide-react';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: { name: true, seoTitle: true, seoDescription: true, description: true, images: true },
  });
  if (!p) return {};
  return {
    title: p.seoTitle || `${p.name} | وَهَج`,
    description: p.seoDescription || p.description || `اكتشفي ${p.name} من وَهَج`,
    openGraph: {
      title: p.seoTitle || p.name,
      description: p.seoDescription || p.description || '',
      images: p.images[0]?.url ? [{ url: p.images[0].url }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [p, payments] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: true,
        relationsFrom: {
          where: {
            type: { in: ['RELATED', 'COMPLEMENTARY', 'UPSELL', 'CROSS_SELL'] },
            toProduct: { status: 'PUBLISHED' },
          },
          include: { toProduct: { include: { images: true } } },
          orderBy: { sortOrder: 'asc' },
          take: 8,
        },
        reviews: {
          where: { approved: true },
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.paymentSetting.findMany({ where: { enabled: true } }),
  ]);

  if (!p || p.status !== 'PUBLISHED') notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || '',
    sku: p.sku,
    image: p.images.map((x) => x.url),
    offers: {
      '@type': 'Offer',
      price: Number(p.price),
      priceCurrency: 'EGP',
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app'}/product/${p.slug}`,
    },
  };

  const mainImage = p.images[0]?.url || '/placeholder.svg';

  return (
    <main className="container py-10 max-w-6xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* رابط العودة للمتجر بتصميم احترافي */}
      <a href="/shop" className="inline-flex items-center gap-1 text-sm font-medium text-[#D4AF37] hover:opacity-80 transition-opacity">
        <ChevronRight size={16} /> العودة للمتجر
      </a>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        
        {/* 1. معرض الصور الاحترافي (Gallery) */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-border/40 bg-muted/20 shadow-sm">
            <img
              src={mainImage}
              alt={p.images[0]?.alt || p.name}
              className="h-full w-full object-cover transition-all duration-500 hover:scale-105"
            />
          </div>

          {/* المصغرات (Thumbnails) */}
          {p.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {p.images.map((im, i) => (
                <div
                  key={im.id || i}
                  className="relative aspect-square w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-border/40 hover:border-[#D4AF37] transition-all cursor-pointer"
                >
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. تفاصيل المنتج وعمليات الشراء */}
        <div className="flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              {p.category?.name || 'وَهَج فخامة'}
            </span>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">{p.name}</h1>
            
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl md:text-3xl font-extrabold text-[#D4AF37]">
                {Number(p.price).toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            {/* حالة المخزون (بدون تكرار مزعج) */}
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              <span>{p.stock > 0 ? `متوفر بالمخزون (${p.stock} قطعة متاحة)` : 'غير متوفر حالياً'}</span>
            </div>

            <WishlistButton productId={p.id} />
            
            {/* مكون الشراء وإضافة للسلة */}
            <div className="mt-5">
              <ProductPurchase product={{ ...p, price: Number(p.price), images: p.images }} />
            </div>

            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            
            {p.stock <= 0 && (
              <div className="mt-4">
                <BackInStockForm productId={p.id} />
              </div>
            )}

            {/* أيقونات وسائل الدفع الآمنة */}
            <div className="mt-6 rounded-2xl border border-border/50 bg-muted/20 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-2.5 text-center">
                طرق الدفع الآمنة المتاحة
              </span>
              <div className="flex items-center justify-around gap-2 text-xs font-medium">
                {payments.some((m) => m.method === 'COD') && (
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] px-3 py-2 rounded-xl border border-border/40 shadow-2xs">
                    <Truck size={15} className="text-[#D4AF37]" />
                    <span>الدفع عند الاستلام</span>
                  </div>
                )}
                {payments.some((m) => m.method === 'VODAFONE_CASH') && (
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] px-3 py-2 rounded-xl border border-border/40 shadow-2xs">
                    <ShieldCheck size={15} className="text-[#D4AF37]" />
                    <span>Vodafone Cash</span>
                  </div>
                )}
                {payments.some((m) => m.method === 'INSTAPAY') && (
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] px-3 py-2 rounded-xl border border-border/40 shadow-2xs">
                    <RotateCcw size={15} className="text-[#D4AF37]" />
                    <span>InstaPay</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* قسم التفاصيل والخامة والعناية */}
      <div className="mt-16 grid gap-8 md:grid-cols-2 border-t border-border/40 pt-10">
        <div className="rounded-2xl border border-border/40 p-6 bg-muted/10">
          <h2 className="text-xl font-semibold mb-4 text-[#D4AF37]">التفاصيل والخامة</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex justify-between border-b border-border/30 pb-2">
              <span className="font-medium text-foreground">الخامة:</span>
              <span>{p.material || 'مختارة بعناية فائقة'}</span>
            </li>
            <li className="flex justify-between border-b border-border/30 pb-2">
              <span className="font-medium text-foreground">العناية:</span>
              <span>{p.careInstructions || 'يُحفظ بعيداً عن الرطوبة والعطور المباشرة.'}</span>
            </li>
            <li className="flex justify-between pb-2">
              <span className="font-medium text-foreground">SKU:</span>
              <span className="font-mono text-xs">{p.sku}</span>
            </li>
          </ul>
        </div>

        {/* قسم تقييمات العميلات */}
        <div className="rounded-2xl border border-border/40 p-6 bg-muted/10">
          <h2 className="text-xl font-semibold mb-4 text-[#D4AF37]">تقييمات العميلات</h2>
          {p.reviews.length > 0 ? (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {p.reviews.map((r: any) => (
                <div key={r.id} className="border-b border-border/30 pb-3">
                  <div className="flex justify-between items-center">
                    <b className="text-sm">{r.customer.name}</b>
                    <span className="text-[#D4AF37] text-xs">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">كوني أول من يشارك تجربته.</p>
          )}
          <div className="mt-4">
            <ReviewForm productId={p.id} />
          </div>
        </div>
      </div>

      {/* المنتجات المرتبطة */}
      {p.relationsFrom.length > 0 && (
        <section className="mt-16 border-t border-border/40 pt-10">
          <h2 className="text-2xl font-semibold mb-6">قد يعجبك أيضًا</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {p.relationsFrom.map((r: any) => (
              <a
                key={r.id}
                href={`/product/${r.toProduct.slug}`}
                className="group rounded-2xl border border-border/40 bg-[var(--bg)] p-3 shadow-sm transition-all hover:shadow-md"
              >
                <div className="overflow-hidden rounded-xl bg-muted/35 aspect-square">
                  <img
                    src={r.toProduct.images?.[0]?.url || '/placeholder.svg'}
                    alt={r.toProduct.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="pt-3">
                  <h3 className="font-medium text-sm line-clamp-1">{r.toProduct.name}</h3>
                  <div className="mt-1.5 font-bold text-sm text-[#D4AF37]">
                    {Number(r.toProduct.price).toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed products={[p]} />
    </main>
  );
}
