import {prisma} from '@/lib/prisma';
import {notFound} from 'next/navigation';
import ProductPurchase from '@/components/ProductPurchase';
import WishlistButton from '@/components/WishlistButton';
import ReviewForm from '@/components/ReviewForm';
import BackInStockForm from '@/components/BackInStockForm';
import RecentlyViewed from '@/components/RecentlyViewed';

export async function generateMetadata({params}:{params:{slug:string}}){
 const p=await prisma.product.findUnique({where:{slug:params.slug},select:{name:true,seoTitle:true,seoDescription:true,description:true,images:true}});
 if(!p)return {};
 return {title:p.seoTitle||`${p.name} | وَهَج`,description:p.seoDescription||p.description||`اكتشفي ${p.name} من وَهَج`,openGraph:{title:p.seoTitle||p.name,description:p.seoDescription||p.description||'',images:p.images[0]?.url?[{url:p.images[0].url}]:[]}};
}

export default async function ProductPage({params}:{params:{slug:string}}){
 const [p,payments]=await Promise.all([
  prisma.product.findUnique({where:{slug:params.slug},include:{images:{orderBy:{sortOrder:'asc'}},category:true,variants:true,relationsFrom:{where:{type:{in:['RELATED','COMPLEMENTARY','UPSELL','CROSS_SELL']},toProduct:{status:'PUBLISHED'}},include:{toProduct:{include:{images:true}}},orderBy:{sortOrder:'asc'},take:8},reviews:{where:{approved:true},include:{customer:{select:{name:true}}},orderBy:{createdAt:'desc'},take:20}}}),
  prisma.paymentSetting.findMany({where:{enabled:true}})
 ]);
 if(!p||p.status!=='PUBLISHED')notFound();
 const jsonLd={"@context":"https://schema.org","@type":"Product",name:p.name,description:p.description||'',sku:p.sku,image:p.images.map(x=>x.url),offers:{"@type":"Offer",price:Number(p.price),priceCurrency:"EGP",availability:p.stock>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",url:`${process.env.NEXT_PUBLIC_SITE_URL||'https://example.com'}/product/${p.slug}`}};
 return <main className="container py-10">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <a href="/shop" className="gold text-sm">‹ العودة للمتجر</a>
  <div className="mt-8 grid gap-10 md:grid-cols-2">
   <div className="grid gap-3 sm:grid-cols-2">{p.images.map((im,i)=><img key={im.id} src={im.url} alt={im.alt||p.name} loading={i?'lazy':'eager'} className={`w-full rounded-lg object-cover ${i===0?'sm:col-span-2 aspect-[4/3]':'aspect-square'}`}/>)}</div>
   <div>
    <span className="text-sm gold">{p.category.name}</span><h1 className="mt-3 text-4xl font-semibold">{p.name}</h1>
    <WishlistButton productId={p.id}/><ProductPurchase product={{...p,price:Number(p.price),images:p.images}}/>
    <p className="mt-6 leading-9 muted">{p.description}</p><div className="mt-5 text-sm">{p.stock>0?<span>متوفر • {p.stock} قطعة</span>:<span>غير متوفر حالياً</span>}</div>{p.stock<=0&&<BackInStockForm productId={p.id}/>}
    <div className="mt-4 lux-card p-3 flex items-center justify-center gap-2 text-xs">{payments.some(m=>m.method==='COD')&&<span className="payment-icon" title="الدفع عند الاستلام"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></span>}{payments.some(m=>m.method==='VODAFONE_CASH')&&<span className="payment-icon" title="Vodafone Cash"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v12H5z" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></span>}{payments.some(m=>m.method==='INSTAPAY')&&<span className="payment-icon" title="InstaPay"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></span>}</div>
    <div className="mt-10 border-t hairline pt-7"><h2 className="text-xl font-semibold">التفاصيل</h2><p className="mt-4 leading-8">الخامة: {p.material||'مختارة بعناية'}<br/>العناية: {p.careInstructions||'يُحفظ بعيداً عن الرطوبة والعطور المباشرة.'}<br/>SKU: {p.sku}</p></div>
    <div className="mt-10 border-t hairline pt-7"><h2 className="text-xl font-semibold">تقييمات العميلات</h2>{p.reviews.map(r=><div className="mt-4 border-b hairline pb-4" key={r.id}><b>{r.customer.name}</b><div className="gold">{'★'.repeat(r.rating)}</div><p className="mt-1 muted">{r.text}</p></div>)}{!p.reviews.length&&<p className="muted mt-3">كوني أول من يشارك تجربته.</p>}<ReviewForm productId={p.id}/></div>
   </div>
  </div>
  {p.relationsFrom.length>0&&<section className="mt-14 border-t hairline pt-10"><h2 className="text-2xl font-semibold">قد يعجبك أيضًا</h2><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{p.relationsFrom.map((r:any)=><a key={r.id} href={`/product/${r.toProduct.slug}`} className="lux-card overflow-hidden"><img src={r.toProduct.images?.[0]?.url||'/placeholder.svg'} alt={r.toProduct.name} className="aspect-square w-full object-cover"/><div className="p-3 text-sm">{r.toProduct.name}<div className="mt-1 font-semibold">{Number(r.toProduct.price).toLocaleString('ar-EG')} ج.م</div></div></a>)}</div></section>}
  <RecentlyViewed products={[p]}/></main>
}
