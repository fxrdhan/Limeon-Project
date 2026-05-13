import { useRef } from 'react';

export function useComboboxRootRefs() {
  const popupRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  return {
    popupRef,
    triggerRef,
  };
}
