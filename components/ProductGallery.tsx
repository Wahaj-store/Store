'use client';

import Image from 'next/image';
import { useState } from 'react';

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
};

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
  const activeImage = items[activeIndex] ?? items[0];

  return (
    <div className="wahaj-product-gallery">
      <div className="wahaj-product-gallery__stage">
        <span className="wahaj-product-gallery__wash" aria-hidden="true" />
        <Image
          key={activeImage.url}
          src={activeImage.url}
          alt={activeImage.alt || productName}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 800px) calc(100vw - 32px), 52vw"
          className="wahaj-product-gallery__image"
        />
        <span className="wahaj-product-gallery__label">اختيار وَهَج</span>
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
              className={`wahaj-product-gallery__thumb ${activeIndex === index ? 'is-active' : ''}`}
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
      ) : (
        <p className="wahaj-product-gallery__caption">تفاصيل مختارة بعناية، كما تليق بكِ.</p>
      )}
    </div>
  );
}
