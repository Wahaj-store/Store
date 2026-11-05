'use client';

import Image from 'next/image';

type StoryImageProps = {
  src: string;
};

export default function StoryImage({ src }: StoryImageProps) {
  return (
    <Image
      src={src}
      alt="تفاصيل من عالم وَهَج"
      fill
      sizes="(max-width:800px) 100vw, 44vw"
      loading="lazy"
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) {
          event.currentTarget.parentElement?.style.setProperty(
            '--wahaj-story-image-ratio',
            `${naturalWidth} / ${naturalHeight}`,
          );
        }
      }}
    />
  );
}
