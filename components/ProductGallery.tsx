'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
};

type Position = { x: number; y: number };
type TouchGesture = {
  kind: 'swipe' | 'pan' | 'pinch';
  startX: number;
  startY: number;
  startDistance: number;
  startZoom: number;
  startPosition: Position;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const gallery = images?.filter((image) => Boolean(image?.url)) ?? [];
  const items = gallery.length ? gallery : [{ url: '/placeholder.svg', alt: productName }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPosition, setLightboxPosition] = useState<Position>({ x: 0, y: 0 });
  const touchGesture = useRef<TouchGesture | null>(null);
  const mouseDrag = useRef<{ x: number; y: number; position: Position } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const activeImage = items[activeIndex] ?? items[0];

  const updateZoomOrigin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100);
    setZoomOrigin({ x, y });
  };

  const openLightbox = () => {
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
    setLightboxOpen(true);
  };

  const changeImage = (direction: number) => {
    setActiveIndex((current) => (current + direction + items.length) % items.length);
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
  };

  const toggleLightboxZoom = () => {
    const next = lightboxZoom > 1 ? 1 : 2.4;
    setLightboxZoom(next);
    if (next === 1) setLightboxPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft' && items.length > 1) changeImage(1);
      if (event.key === 'ArrowRight' && items.length > 1) changeImage(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, items.length]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touches = event.touches;
    if (touches.length >= 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchGesture.current = {
        kind: 'pinch',
        startX: (touches[0].clientX + touches[1].clientX) / 2,
        startY: (touches[0].clientY + touches[1].clientY) / 2,
        startDistance: Math.hypot(dx, dy),
        startZoom: lightboxZoom,
        startPosition: lightboxPosition,
      };
    } else if (touches.length === 1) {
      touchGesture.current = {
        kind: lightboxZoom > 1 ? 'pan' : 'swipe',
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        startDistance: 0,
        startZoom: lightboxZoom,
        startPosition: lightboxPosition,
      };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGesture.current;
    if (!gesture) return;
    if (gesture.kind === 'pinch' && event.touches.length >= 2) {
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const nextZoom = clamp(gesture.startZoom * (Math.hypot(dx, dy) / gesture.startDistance), 1, 4);
      setLightboxZoom(nextZoom);
      if (nextZoom === 1) setLightboxPosition({ x: 0, y: 0 });
      return;
    }
    if (gesture.kind === 'pan' && event.touches.length === 1) {
      event.preventDefault();
      setLightboxPosition({
        x: gesture.startPosition.x + event.touches[0].clientX - gesture.startX,
        y: gesture.startPosition.y + event.touches[0].clientY - gesture.startY,
      });
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGesture.current;
    touchGesture.current = null;
    if (!gesture || gesture.kind !== 'swipe' || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    if (items.length > 1 && Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      changeImage(dx < 0 ? 1 : -1);
      lastTap.current = null;
      return;
    }
    const now = Date.now();
    const priorTap = lastTap.current;
    if (priorTap && now - priorTap.time < 300 && Math.hypot(touch.clientX - priorTap.x, touch.clientY - priorTap.y) < 24) {
      toggleLightboxZoom();
      lastTap.current = null;
    } else {
      lastTap.current = { time: now, x: touch.clientX, y: touch.clientY };
    }
  };

  return (
    <div className="wahaj-product-gallery">
      <div
        className={`wahaj-product-gallery__stage wahaj-gallery-enter ${isZoomed ? 'is-zoomed' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`تكبير صورة ${productName}`}
        onClick={openLightbox}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox();
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setIsZoomed(true);
        }}
        onPointerMove={updateZoomOrigin}
        onPointerLeave={() => setIsZoomed(false)}
      >
        <span className="wahaj-product-gallery__wash" aria-hidden="true" />
        <Image
          key={activeImage.url}
          src={activeImage.url}
          alt={activeImage.alt || productName}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 800px) calc(100vw - 32px), 52vw"
          className="wahaj-product-gallery__image wahaj-gallery-image-enter"
          style={{ '--wahaj-zoom-x': `${zoomOrigin.x}%`, '--wahaj-zoom-y': `${zoomOrigin.y}%` } as React.CSSProperties}
        />
        {items.length > 1 ? (
          <span className="wahaj-product-gallery__count" aria-live="polite">
            {String(activeIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      {items.length > 1 ? (
        <div className="wahaj-product-gallery__thumbs" role="tablist" aria-label={`صور ${productName}`}>
          {items.map((image, index) => (
            <button
              key={image.id || `${image.url}-${index}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`عرض الصورة ${index + 1} من ${items.length}`}
              className={`wahaj-product-gallery__thumb wahaj-gallery-thumb-enter ${activeIndex === index ? 'is-active' : ''}`}
              style={{ '--wahaj-thumb-index': index } as React.CSSProperties}
              onClick={() => setActiveIndex(index)}
            >
              <Image
                src={image.url}
                alt={image.alt || `${productName}، صورة ${index + 1}`}
                fill
                sizes="82px"
                className="wahaj-product-gallery__thumb-image"
              />
            </button>
          ))}
        </div>
      ) : null}

      {lightboxOpen ? (
        <div className="wahaj-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`معرض صور ${productName}`}>
          <header className="wahaj-gallery-lightbox__toolbar" dir="ltr">
            <div className="wahaj-gallery-lightbox__tools">
              <button type="button" onClick={closeLightbox} aria-label="إغلاق التكبير"><X size={24} /></button>
              <button type="button" onClick={toggleLightboxZoom} aria-label={lightboxZoom > 1 ? 'تصغير الصورة' : 'تكبير الصورة'}>
                {lightboxZoom > 1 ? <ZoomOut size={21} /> : <ZoomIn size={21} />}
              </button>
            </div>
            <span className="wahaj-gallery-lightbox__counter" aria-live="polite">
              {activeIndex + 1} / {items.length}
            </span>
          </header>
          <div
            className={`wahaj-gallery-lightbox__viewport ${lightboxZoom > 1 ? 'is-zoomed' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchGesture.current = null; }}
            onDoubleClick={toggleLightboxZoom}
            onWheel={(event) => {
              if (event.deltaY === 0) return;
              const nextZoom = clamp(lightboxZoom + (event.deltaY < 0 ? 0.25 : -0.25), 1, 4);
              setLightboxZoom(nextZoom);
              if (nextZoom === 1) setLightboxPosition({ x: 0, y: 0 });
            }}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' && lightboxZoom > 1) {
                mouseDrag.current = { x: event.clientX, y: event.clientY, position: lightboxPosition };
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              const drag = mouseDrag.current;
              if (event.pointerType === 'mouse' && drag) {
                setLightboxPosition({ x: drag.position.x + event.clientX - drag.x, y: drag.position.y + event.clientY - drag.y });
              }
            }}
            onPointerUp={() => { mouseDrag.current = null; }}
            onPointerCancel={() => { mouseDrag.current = null; }}
          >
            <Image
              key={`lightbox-${activeImage.url}`}
              src={activeImage.url}
              alt={activeImage.alt || productName}
              fill
              priority
              sizes="100vw"
              draggable={false}
              className="wahaj-gallery-lightbox__image"
              style={{ transform: `translate3d(${lightboxPosition.x}px, ${lightboxPosition.y}px, 0) scale(${lightboxZoom})` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
