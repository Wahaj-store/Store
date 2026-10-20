'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import { useFeatureFlags } from '@/lib/use-feature-flags';
export default function RecentlyViewed({products}:{products:any[]}){
 const[current,setCurrent]=useState<any[]>([]);
 const { flags } = useFeatureFlags();
 useEffect(()=>{if(!flags.recently_viewed){setCurrent([]);return;} try{const currentProduct=products[products.length-1]; if(!currentProduct?.id)return; const old=JSON.parse(localStorage.getItem('wahaj_recent')||'[]'); const normalized=old.filter((x:any)=>x?.id!==currentProduct.id); const item={id:currentProduct.id,slug:currentProduct.slug,name:currentProduct.name,price:Number(currentProduct.price),image:currentProduct.images?.[0]?.url||'/placeholder.svg'}; const next=[item,...normalized].slice(0,12); localStorage.setItem('wahaj_recent',JSON.stringify(next)); setCurrent(next.slice(1,7));}catch{setCurrent([])}},[products,flags.recently_viewed]);
 if(!current.length)return null;
 return (
  <section className="wahaj-recently-viewed" aria-labelledby="recently-viewed-title" dir="rtl">
   <div className="wahaj-recently-viewed__heading">
    <div>
     <span>اختياراتك الأخيرة</span>
     <h2 id="recently-viewed-title">شاهدتِ مؤخرًا</h2>
    </div>
   </div>
   <div className="wahaj-recently-viewed__grid">
    {current.map((p:any) => (
     <Link href={`/product/${p.slug}`} key={p.id} className="wahaj-recent-card">
      <div className="wahaj-recent-card__media">
       <Image src={p.image} alt={p.name} width={600} height={600} sizes="(max-width: 768px) 50vw, 16.666vw" className="wahaj-recent-card__image" />
      </div>
      <div className="wahaj-recent-card__body">
       <span className="wahaj-recent-card__name">{p.name}</span>
       <strong>{Number(p.price).toLocaleString('ar-EG')} ج.م</strong>
      </div>
     </Link>
    ))}
   </div>
  </section>
 );
}
