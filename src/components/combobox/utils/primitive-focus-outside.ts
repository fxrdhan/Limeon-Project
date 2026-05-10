import { useEffect, type RefObject } from 'react';

export function useComboboxFocusOutside({
  enabled,
  onFocusOutside,
  popupRef,
  triggerRef,
}: {
  enabled: boolean;
  onFocusOutside: (event: FocusEvent) => void;
  popupRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }

      onFocusOutside(event);
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [enabled, onFocusOutside, popupRef, triggerRef]);
}
