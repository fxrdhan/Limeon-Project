import { useEffect, type MutableRefObject, type RefObject } from 'react';

interface UsePinnedViewportResizeSyncProps<TElement extends Element> {
  isOpen: boolean;
  observedRef?: RefObject<TElement | null>;
  getObservedSize: (element: TElement) => number;
  shouldPinToBottomOnOpenRef: MutableRefObject<boolean>;
  shouldMaintainBottomDuringComposerResizeRef: MutableRefObject<boolean>;
  isAtBottomRef: MutableRefObject<boolean>;
  isPinnedViewportSyncSuspended: () => boolean;
  pinViewportToBottom: () => void;
  scheduleVisibleUnreadReadReceipts: () => void;
}

export const usePinnedViewportResizeSync = <TElement extends Element>({
  isOpen,
  observedRef,
  getObservedSize,
  shouldPinToBottomOnOpenRef,
  shouldMaintainBottomDuringComposerResizeRef,
  isAtBottomRef,
  isPinnedViewportSyncSuspended,
  pinViewportToBottom,
  scheduleVisibleUnreadReadReceipts,
}: UsePinnedViewportResizeSyncProps<TElement>) => {
  useEffect(() => {
    const observedElement = observedRef?.current;
    if (!isOpen || !observedElement || typeof ResizeObserver === 'undefined') {
      return;
    }

    let previousSize = getObservedSize(observedElement);

    const syncPinnedViewport = () => {
      const nextSize = getObservedSize(observedElement);
      if (Math.abs(nextSize - previousSize) < 0.5) {
        return;
      }

      previousSize = nextSize;

      if (isPinnedViewportSyncSuspended()) {
        return;
      }

      if (
        !shouldPinToBottomOnOpenRef.current &&
        !shouldMaintainBottomDuringComposerResizeRef.current &&
        !isAtBottomRef.current
      ) {
        return;
      }

      pinViewportToBottom();
      scheduleVisibleUnreadReadReceipts();
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(syncPinnedViewport);
    });
    resizeObserver.observe(observedElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    getObservedSize,
    isAtBottomRef,
    isOpen,
    isPinnedViewportSyncSuspended,
    observedRef,
    pinViewportToBottom,
    scheduleVisibleUnreadReadReceipts,
    shouldMaintainBottomDuringComposerResizeRef,
    shouldPinToBottomOnOpenRef,
  ]);
};
