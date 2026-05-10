import { useEffect, type RefObject } from 'react';

export function useComboboxOutsidePress({
  enabled,
  onOutsidePress,
  popupRef,
  triggerRef,
}: {
  enabled: boolean;
  onOutsidePress: (event: PointerEvent) => void;
  popupRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }

      onOutsidePress(event);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [enabled, onOutsidePress, popupRef, triggerRef]);
}
