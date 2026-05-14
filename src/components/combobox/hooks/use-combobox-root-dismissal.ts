import { useCallback, type RefObject } from 'react';
import type React from 'react';
import type { ComboboxEventReason as EventReason } from '../utils/primitive-events';
import { useComboboxFocusOutside } from '../utils/primitive-focus-outside';
import { useComboboxOutsidePress } from '../utils/primitive-outside-press';

export function useComboboxRootDismissal({
  open,
  popupRef,
  setOpen,
  triggerRef,
}: {
  open: boolean;
  popupRef: RefObject<HTMLElement | null>;
  setOpen: (
    open: boolean,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const handleOutsidePress = useCallback(
    (event: PointerEvent) => {
      setOpen(false, 'outside-press', event);
    },
    [setOpen]
  );
  const handleFocusOutside = useCallback(
    (event: FocusEvent) => {
      setOpen(false, 'focus-out', event);
    },
    [setOpen]
  );

  useComboboxOutsidePress({
    enabled: open,
    onOutsidePress: handleOutsidePress,
    popupRef,
    triggerRef,
  });
  useComboboxFocusOutside({
    enabled: open,
    onFocusOutside: handleFocusOutside,
    popupRef,
    triggerRef,
  });
}
