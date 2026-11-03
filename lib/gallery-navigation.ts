export type GalleryNavigationKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/** Return the target thumbnail index for horizontal keyboard navigation. */
export function getGalleryKeyboardTarget(
  currentIndex: number,
  key: string,
  itemCount: number,
  direction: 'rtl' | 'ltr' = 'rtl',
): number | null {
  if (
    !Number.isInteger(itemCount)
    || itemCount < 1
    || !Number.isInteger(currentIndex)
    || currentIndex < 0
    || currentIndex >= itemCount
  ) return null;

  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;

  const step = direction === 'rtl'
    ? (key === 'ArrowLeft' ? 1 : key === 'ArrowRight' ? -1 : 0)
    : (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0);
  if (step === 0) return null;
  return (currentIndex + step + itemCount) % itemCount;
}
