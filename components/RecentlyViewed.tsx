'use client';
import {useEffect,useState} from 'react';
export default function RecentlyViewed({products}:{products:any[]}){
 const[current,setCurrent]=useState<any[]>([]);
 useEffect(()=>{try{const currentProduct=products[products.length-1]; if(!currentProduct?.id)return; const old=JSON.parse(localStorage.getItem('wahaj_recent')||'[]'); const normalized=old.filter((x:any)=>x?.id!==currentProduct.id); const item={id:currentProduct.id,slug:currentProduct.slug,name:currentProduct.name,price:Number(currentProduct.price),image:currentProduct.images?.[0]?.url||'/placeholder.svg'}; const next=[item,...normalized].slice(0,12); localStorage.setItem('wahaj_recent',JSON.stringify(next)); setCurrent(next.slice(1,7));}catch{setCurrent([])}},[products]);
 if(!current.length)return null;
 return <section className="mt-14 border-t hairline pt-10"><h2 className="text-2xl font-semibold">شاهدتِ مؤخرًا</h2><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">{current.map((p:any)=><a href={`/product/${p.slug}`} key={p.id} className="lux-card overflow-hidden"><img src={p.image} alt={p.name} className="aspect-square w-full object-cover"/><div className="p-3 text-sm">{p.name}<div className="mt-1 font-semibold">{Number(p.price).toLocaleString('ar-EG')} ج.م</div></div></a>)}</div></section>
}
