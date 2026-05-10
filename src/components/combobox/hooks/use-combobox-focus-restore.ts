import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { ComboboxRootProps } from '../primitive';

type ComboboxOpenChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onOpenChange']>
>[1];

export function useComboboxFocusRestore<Item>({
  isOpenControlled,
  onOpenChange,
  popupContentRef,
  rootRef,
  setUncontrolledOpen,
}: {
  isOpenControlled: boolean;
  onOpenChange?: (
    open: boolean,
    details: ComboboxOpenChangeDetails<Item>
  ) => void;
  popupContentRef: RefObject<HTMLDivElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  setUncontrolledOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusRestoreFrameRef = useRef<number | null>(null);
  const shouldRestoreFocusOnCloseRef = useRef(false);

  const isFocusWithinCombobox = useCallback(
    (target: EventTarget | null) => {
      if (typeof Node === 'undefined' || !(target instanceof Node)) {
        return false;
      }

      return Boolean(
        rootRef.current?.contains(target) ||
        popupContentRef.current?.contains(target)
      );
    },
    [popupContentRef, rootRef]
  );

  const restoreTriggerFocus = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (focusRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(focusRestoreFrameRef.current);
    }

    focusRestoreFrameRef.current = window.requestAnimationFrame(() => {
      focusRestoreFrameRef.current = null;
      const activeElement = document.activeElement;
      if (
        activeElement &&
        activeElement !== document.body &&
        !isFocusWithinCombobox(activeElement)
      ) {
        return;
      }

      triggerButtonRef.current?.focus({ preventScroll: true });
    });
  }, [isFocusWithinCombobox]);

  const shouldRestoreFocusAfterClose = useCallback(
    (details: ComboboxOpenChangeDetails<Item>) => {
      if (details.reason === 'outside-press') return false;

      if (isFocusWithinCombobox(details.event?.target ?? null)) return true;

      return (
        typeof document !== 'undefined' &&
        isFocusWithinCombobox(document.activeElement)
      );
    },
    [isFocusWithinCombobox]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean, details: ComboboxOpenChangeDetails<Item>) => {
      shouldRestoreFocusOnCloseRef.current = nextOpen
        ? false
        : shouldRestoreFocusAfterClose(details);

      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) {
        shouldRestoreFocusOnCloseRef.current = false;
        return;
      }

      if (!isOpenControlled) setUncontrolledOpen(nextOpen);
    },
    [
      isOpenControlled,
      onOpenChange,
      setUncontrolledOpen,
      shouldRestoreFocusAfterClose,
    ]
  );

  const clearFocusRestoreIntent = useCallback(() => {
    shouldRestoreFocusOnCloseRef.current = false;
  }, []);

  const restoreFocusAfterCloseIfNeeded = useCallback(() => {
    if (!shouldRestoreFocusOnCloseRef.current) return;

    shouldRestoreFocusOnCloseRef.current = false;
    restoreTriggerFocus();
  }, [restoreTriggerFocus]);

  const setTriggerButtonRef = useCallback((node: HTMLButtonElement | null) => {
    triggerButtonRef.current = node;
  }, []);

  useEffect(
    () => () => {
      if (focusRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(focusRestoreFrameRef.current);
      }
    },
    []
  );

  return {
    clearFocusRestoreIntent,
    handleOpenChange,
    isFocusWithinCombobox,
    restoreFocusAfterCloseIfNeeded,
    setTriggerButtonRef,
  };
}
