'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, LoaderCircle, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/use-dialog-focus';

type MediaItem = { id: string; url: string; name?: string };
type MediaPickerProps = {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
};

const selectedValues = (value?: string | string[]) => Array.isArray(value) ? value : value ? [value] : [];

export default function MediaPicker({ value, onChange, multiple = false }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<string[]>(() => selectedValues(value));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ open, initialFocusRef: closeButtonRef });
  const visibleValues = selectedValues(value);

  useEffect(() => {
    setSelected(visibleValues);
  // Keep local selection in sync with controlled parent values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/media', { cache: 'no-store', signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'تعذر تحميل مكتبة الوسائط.');
      if (!Array.isArray(data)) throw new Error('تعذر قراءة محتوى مكتبة الوسائط.');
      setItems(data.filter((item): item is MediaItem => Boolean(item && typeof item.id === 'string' && typeof item.url === 'string')));
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') {
        setItems([]);
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل مكتبة الوسائط.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void loadItems(controller.signal);
    return () => controller.abort();
  }, [open, loadItems]);

  const close = () => setOpen(false);
  const choose = (url: string) => {
    if (multiple) {
      const next = selected.includes(url) ? selected.filter((item) => item !== url) : [...selected, url];
      setSelected(next);
      onChange(next);
      return;
    }
    setSelected([url]);
    onChange(url);
    close();
  };

  return (
    <>
      <button ref={openerRef} type="button" className="btn" onClick={() => setOpen(true)}>
        <ImageIcon size={16} aria-hidden="true" /> اختيار من مكتبة الوسائط
      </button>
      {visibleValues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="الصور المختارة">
          {visibleValues.map((url) => <Image key={url} src={url} width={64} height={64} alt="" className="h-16 w-16 rounded-sm object-cover" />)}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <div
            ref={dialogRef}
            className="lux-card max-h-[85vh] w-full max-w-4xl overflow-auto p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wahaj-media-picker-title"
            dir="rtl"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="wahaj-media-picker-title" className="text-xl font-semibold">مكتبة الوسائط</h2>
              <button ref={closeButtonRef} type="button" onClick={close} aria-label="إغلاق مكتبة الوسائط">
                <X aria-hidden="true" />
              </button>
            </div>

            {loading ? (
              <div className="muted flex items-center justify-center gap-2 py-10" role="status" aria-live="polite">
                <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> جارٍ تحميل مكتبة الوسائط...
              </div>
            ) : error ? (
              <div className="py-10 text-center" role="alert">
                <p className="mb-4">{error}</p>
                <button type="button" className="btn" onClick={() => void loadItems()}>إعادة المحاولة</button>
              </div>
            ) : items.length === 0 ? (
              <p className="muted py-10 text-center" role="status">المكتبة فارغة. ارفعي صورًا من قسم الوسائط أولاً.</p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6" aria-label="الصور المتاحة">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => choose(item.url)}
                    className={`relative overflow-hidden rounded-sm border ${selected.includes(item.url) ? 'border-(--gold)' : ''}`}
                    aria-pressed={selected.includes(item.url)}
                    aria-label={`${item.name || 'صورة'}${selected.includes(item.url) ? '، محددة' : ''}`}
                  >
                    <Image src={item.url} width={400} height={400} alt="" sizes="(max-width: 640px) 50vw, 16.666vw" className="aspect-square w-full object-cover" />
                    {selected.includes(item.url) && <span className="absolute top-1 inset-e-1 rounded-full bg-(--gold) p-1" aria-hidden="true"><Check size={12} /></span>}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="btn mt-5" onClick={close}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}
