'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { getGalleryKeyboardTarget } from '../lib/gallery-navigation';

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
};

type LightboxProps = {
  images: ProductImage[];
  productName: string;
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export default function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const items = images?.filter((image) => Boolean(image?.url)) ?? [];
  const galleryItems = items.length ? items : [{ url: '/placeholder.svg', alt: productName }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [Lightbox, setLightbox] = useState<ComponentType<LightboxProps> | null>(null);
  const lightboxImport = useRef<Promise<ComponentType<LightboxProps>> | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeImage = galleryItems[activeIndex] ?? galleryItems[0];

  const openLightbox = async () => {
    if (!lightboxImport.current) {
      lightboxImport.current = import('./ProductLightbox').then((module) => module.default);
    }
    const LightboxComponent = await lightboxImport.current;
    setLightbox(() => LightboxComponent);
    setLightboxOpen(true);
  };

  const updateZoomOrigin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    setZoomOrigin({ x, y });
  };

  const handleThumbnailKeyDown = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const dir = event.currentTarget.closest<HTMLElement>('[dir]')?.getAttribute('dir') === 'ltr' ? 'ltr' : 'rtl';
    const nextIndex = getGalleryKeyboardTarget(index, event.key, galleryItems.length, dir);
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    thumbnailRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="wahaj-product-gallery">
      <div
        className={`wahaj-product-gallery__stage wahaj-gallery-enter ${isZoomed ? 'is-zoomed' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`تكبير صورة ${productName}`}
        onClick={() => { void openLightbox(); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void openLightbox();
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
          fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
          sizes="(max-width: 800px) calc(100vw - 32px), 52vw"
          className="wahaj-product-gallery__image wahaj-gallery-image-enter"
          style={{ '--wahaj-zoom-x': `${zoomOrigin.x}%`, '--wahaj-zoom-y': `${zoomOrigin.y}%` } as React.CSSProperties}
        />
        {galleryItems.length > 1 ? (
          <span className="wahaj-product-gallery__count" aria-live="polite">
            {String(activeIndex + 1).padStart(2, '0')} / {String(galleryItems.length).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      {galleryItems.length > 1 ? (
        <div className="wahaj-product-gallery__thumbs" role="tablist" aria-label={`صور ${productName}`}>
          {galleryItems.map((image, index) => (
            <button
              key={image.id || `${image.url}-${index}`}
              ref={(element) => { thumbnailRefs.current[index] = element; }}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              tabIndex={activeIndex === index ? 0 : -1}
              aria-label={`عرض الصورة ${index + 1} من ${galleryItems.length}`}
              className={`wahaj-product-gallery__thumb wahaj-gallery-thumb-enter ${activeIndex === index ? 'is-active' : ''}`}
              style={{ '--wahaj-thumb-index': index } as React.CSSProperties}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleThumbnailKeyDown(index, event)}
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

      {Lightbox && lightboxOpen ? (
        <Lightbox
          images={galleryItems}
          productName={productName}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
