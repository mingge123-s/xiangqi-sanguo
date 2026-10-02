import { useLayoutEffect, useRef } from 'react';

const openDialogs: symbol[] = [];
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep keyboard navigation in the topmost dialog, then return to its opener. */
export function useDialogFocus(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = Symbol('dialog');
    openDialogs.push(token);
    const isTopmost = () => openDialogs.at(-1) === token;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]'));
    const focusInitial = () => {
      const initial = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? focusable()[0] ?? dialog;
      initial.focus({ preventScroll: true });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      const first = targets[0] ?? dialog;
      const last = targets.at(-1) ?? dialog;
      const current = document.activeElement;
      if (!dialog.contains(current) || current === dialog || (event.shiftKey ? current === first : current === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isTopmost() && event.target instanceof Node && !dialog.contains(event.target)) focusInitial();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    focusInitial();
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const wasTopmost = isTopmost();
      const index = openDialogs.indexOf(token);
      if (index !== -1) openDialogs.splice(index, 1);
      if (wasTopmost && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return dialogRef;
}
