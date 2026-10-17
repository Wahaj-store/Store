"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function CategoryCarousel({ categories, layout = "carousel" }: { categories: any[]; layout?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    // scrollLeft may be negative in RTL; use its absolute position for robust edge checks.
    const max = el.scrollWidth - el.clientWidth;
    const position = Math.abs(el.scrollLeft);
    setHasOverflow(max > 4);
    const card = el.querySelector<HTMLElement>(".wahaj-category-card");
    const gap = card ? parseFloat(getComputedStyle(el).columnGap || "0") : 0;
    const stride = card ? card.getBoundingClientRect().width + gap : el.clientWidth;
    setActiveDot(Math.max(0, Math.min(categories.length - 1, Math.round(position / Math.max(1, stride)))));
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
  const scrollToCategory = (index: number) => {
    const el = trackRef.current;
    const card = el?.querySelectorAll<HTMLElement>(".wahaj-category-card")[index];
    if (!el || !card) return;
    const direction = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const rtl = getComputedStyle(el).direction === "rtl";
    const left = rtl ? card.offsetLeft - (el.scrollWidth - el.clientWidth) : card.offsetLeft;
    el.scrollTo({ left, behavior: direction });
    setActiveDot(index);
  };

  if (!categories.length) return <div className="wahaj-categories-empty">نعمل على تجهيز تصنيفات وَهَج لكِ قريبًا.</div>;
  return <div className={`wahaj-category-browser${isGrid ? " is-grid" : ""}${isRound ? " is-round" : ""}`}>
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
    {!isGrid && hasOverflow && <nav className="wahaj-category-dots" aria-label="اختيار مجموعة التصنيفات">
      {categories.map((category, index) => <button key={category.id} type="button" className={activeDot === index ? "is-active" : ""} onClick={() => scrollToCategory(index)} aria-label={`عرض التصنيف ${category.name}`} aria-current={activeDot === index ? "true" : undefined} />)}
    </nav>}
  </div>;
}
