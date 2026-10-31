'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

type DialogFocusOptions = {
  open: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
};

/** Keep keyboard focus within an open modal and restore it to its opener on close. */
export function useDialogFocus<T extends HTMLElement>({
  open,
  initialFocusRef,
  onEscape,
}: DialogFocusOptions) {
  const dialogRef = useRef<T>(null);
  const escapeHandlerRef = useRef(onEscape);
  const initialTargetRef = useRef(initialFocusRef);

  useEffect(() => {
    escapeHandlerRef.current = onEscape;
    initialTargetRef.current = initialFocusRef;
  }, [onEscape, initialFocusRef]);

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);

    const initialTarget = initialTargetRef.current?.current;
    (initialTarget && !initialTarget.hasAttribute('disabled') ? initialTarget : getFocusable()[0])?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (escapeHandlerRef.current) {
          event.preventDefault();
          event.stopPropagation();
          escapeHandlerRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return dialogRef;
}
