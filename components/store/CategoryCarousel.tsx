"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";

export default function CategoryCarousel({ categories, layout = "carousel" }: { categories: any[]; layout?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    // scrollLeft may be negative in RTL; use its absolute position for robust edge checks.
    const max = el.scrollWidth - el.clientWidth;
    const position = Math.abs(el.scrollLeft);
    setHasOverflow(max > 4);
    setCanPrev(position > 4);
    setCanNext(max - position > 4);
  };
  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [categories.length]);

  const isGrid = layout === "grid";
  const isRound = layout === "round" || layout === "circular";
  const scroll = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(220, el.clientWidth * 0.72) * direction;
    el.scrollBy({ left: amount, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  if (!categories.length) return <div className="wahaj-categories-empty">نعمل على تجهيز تصنيفات وَهَج لكِ قريبًا.</div>;
  return <div className={`wahaj-category-browser${isGrid ? " is-grid" : ""}${isRound ? " is-round" : ""}`}>
    {!isGrid && hasOverflow && <div className="wahaj-category-controls" aria-label="التنقل بين التصنيفات">
      <button type="button" onClick={() => scroll(-1)} disabled={!canPrev} aria-label="التصنيفات السابقة"><ArrowRight size={17} /></button>
      <button type="button" onClick={() => scroll(1)} disabled={!canNext} aria-label="التصنيفات التالية"><ArrowLeft size={17} /></button>
    </div>}
    <div className="wahaj-category-track" ref={trackRef} onScroll={update} role="list" aria-label="تصنيفات المتجر">
      {categories.map((category, index) => <Link role="listitem" key={category.id} href={`/shop?category=${encodeURIComponent(category.slug)}`} prefetch={false} className="wahaj-category-card">
        <span className="wahaj-category-card__visual">
          <Image src={category.imageUrl || "/placeholder.svg"} alt={category.imageUrl ? category.name : `صورة غير متاحة لتصنيف ${category.name}`} fill sizes="(max-width: 600px) 66vw, (max-width: 900px) 30vw, 20vw" className="wahaj-category-card__image" loading={index < 2 ? "eager" : "lazy"} />
        </span>
        <span className="wahaj-category-card__name">{category.name}</span>
        {category.description ? <span className="wahaj-category-card__description">{category.description}</span> : null}
        <span className="wahaj-category-card__link">اكتشفي الفئة <ChevronLeft size={14} /></span>
      </Link>)}
    </div>
  </div>;
}
