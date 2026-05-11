import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { HoverDetailData } from '@/types/components';
import type {
  ComboboxHoverDetailPosition,
  ComboboxHoverDetailSourceData,
} from '@/components/combobox/internal-types';

const hoverDetailHideDelay = 300;
const hoverDetailScrollResumeDelay = 140;
const hoverDetailSwitchDelay = 80;

const getHoverDetailPosition = (
  element: HTMLElement,
  boundaryElement: HTMLElement | null
): ComboboxHoverDetailPosition => {
  const rect = element.getBoundingClientRect();
  const rawBoundaryRect = boundaryElement?.getBoundingClientRect();
  const boundaryRect =
    rawBoundaryRect && rawBoundaryRect.height > 0 ? rawBoundaryRect : undefined;
  const viewportWidth = window.innerWidth;
  const padding = 15;
  const minPortalWidth = 220;
  const maxPortalWidth = 380;
  const spaceOnRight = viewportWidth - rect.right;
  const spaceOnLeft = rect.left;
  const anchorCenterY = rect.top + rect.height / 2;
  const getMaxWidth = (availableSpace: number) =>
    Math.min(
      maxPortalWidth,
      Math.max(minPortalWidth, availableSpace - padding * 2)
    );

  if (spaceOnRight >= minPortalWidth + padding) {
    return {
      left: rect.right + padding,
      top: rect.top,
      boundaryBottom: boundaryRect?.bottom,
      boundaryTop: boundaryRect?.top,
      direction: 'right',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnRight),
    };
  }

  if (spaceOnLeft >= minPortalWidth + padding) {
    return {
      left: rect.left - padding,
      top: rect.top,
      boundaryBottom: boundaryRect?.bottom,
      boundaryTop: boundaryRect?.top,
      direction: 'left',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnLeft),
    };
  }

  if (spaceOnRight >= spaceOnLeft) {
    return {
      left: Math.max(padding, rect.right + padding),
      top: rect.top,
      boundaryBottom: boundaryRect?.bottom,
      boundaryTop: boundaryRect?.top,
      direction: 'right',
      anchorCenterY,
      maxWidth: getMaxWidth(spaceOnRight),
    };
  }

  return {
    left: rect.left - padding,
    top: rect.top,
    boundaryBottom: boundaryRect?.bottom,
    boundaryTop: boundaryRect?.top,
    direction: 'left',
    anchorCenterY,
    maxWidth: getMaxWidth(spaceOnLeft),
  };
};

const getHoverDetailData = (
  itemId: string,
  itemData?: ComboboxHoverDetailSourceData
): HoverDetailData => ({
  id: itemId,
  name: itemData?.name || 'Unknown',
  display: itemData?.display,
  data: itemData?.data,
  code: itemData?.code,
  description: itemData?.description,
  metaLabel: itemData?.metaLabel,
  metaTone: itemData?.metaTone,
  created_at: itemData?.created_at,
  createdAt: itemData?.createdAt,
  updated_at: itemData?.updated_at,
  updatedAt: itemData?.updatedAt,
});

export const useComboboxHoverDetail = ({
  boundaryRef,
  hoverDelay,
  isComboboxOpen,
  isEnabled,
  onFetchData,
  onFetchError,
}: {
  boundaryRef?: RefObject<HTMLElement | null>;
  hoverDelay: number;
  isComboboxOpen: boolean;
  isEnabled: boolean;
  onFetchData?: (itemId: string) => Promise<HoverDetailData | null>;
  onFetchError?: (error: unknown, itemId: string) => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<ComboboxHoverDetailPosition>({
    top: 0,
    left: 0,
    direction: 'right',
    anchorCenterY: 0,
    maxWidth: 460,
  });
  const [data, setData] = useState<HoverDetailData | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const clearDataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const positionUpdateFrameRef = useRef<number | null>(null);
  const currentAnchorElementRef = useRef<HTMLElement | null>(null);
  const currentItemIdRef = useRef<string | null>(null);
  const isPortalShownRef = useRef(false);
  const getPosition = useCallback(
    (element: HTMLElement) =>
      getHoverDetailPosition(element, boundaryRef?.current ?? null),
    [boundaryRef]
  );
  const isBoundaryScrollEvent = useCallback(
    (event: Event) => {
      const boundaryElement = boundaryRef?.current;
      const target = event.target;

      return Boolean(
        boundaryElement &&
        target instanceof Node &&
        boundaryElement.contains(target)
      );
    },
    [boundaryRef]
  );
  const isAnchorFullyInsideBoundary = useCallback(
    (element: HTMLElement) => {
      const boundaryElement = boundaryRef?.current;
      if (!boundaryElement) return true;

      const boundaryRect = boundaryElement.getBoundingClientRect();
      if (boundaryRect.height <= 0) return true;

      const elementRect = element.getBoundingClientRect();

      return (
        elementRect.top >= boundaryRect.top &&
        elementRect.bottom <= boundaryRect.bottom
      );
    },
    [boundaryRef]
  );

  const cancelPositionUpdateFrame = useCallback(() => {
    if (positionUpdateFrameRef.current === null) return;

    window.cancelAnimationFrame(positionUpdateFrameRef.current);
    positionUpdateFrameRef.current = null;
  }, []);

  const schedulePositionUpdate = useCallback(() => {
    if (positionUpdateFrameRef.current !== null) return;

    positionUpdateFrameRef.current = window.requestAnimationFrame(() => {
      positionUpdateFrameRef.current = null;

      const anchorElement = currentAnchorElementRef.current;
      if (!anchorElement?.isConnected) return;

      setPosition(getPosition(anchorElement));
    });
  }, [getPosition]);

  const clearHoverDetailTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }
    if (scrollResumeTimeoutRef.current) {
      clearTimeout(scrollResumeTimeoutRef.current);
      scrollResumeTimeoutRef.current = null;
    }
    if (clearDataTimeoutRef.current) {
      clearTimeout(clearDataTimeoutRef.current);
      clearDataTimeoutRef.current = null;
    }
  }, []);

  const scheduleDataClear = useCallback(() => {
    clearDataTimeoutRef.current = setTimeout(() => {
      setData(null);
      clearDataTimeoutRef.current = null;
    }, 200);
  }, []);

  const fetchHoverDetail = useCallback(
    async (itemId: string) => {
      if (!onFetchData) return;

      try {
        const detail = await onFetchData(itemId);
        if (currentItemIdRef.current === itemId && detail) {
          setData(previousData => ({
            ...previousData,
            ...detail,
          }));
        }
      } catch (error) {
        if (currentItemIdRef.current === itemId) {
          onFetchError?.(error, itemId);
        }
      }
    },
    [onFetchData, onFetchError]
  );

  const commitHoverDetail = useCallback(
    (
      itemId: string,
      element: HTMLElement,
      itemData?: ComboboxHoverDetailSourceData,
      options: { fetch?: boolean } = {}
    ) => {
      if (currentItemIdRef.current !== itemId) return;

      currentAnchorElementRef.current = element;
      isPortalShownRef.current = true;
      setPosition(getPosition(element));
      setIsVisible(true);
      if (itemData) {
        setData(getHoverDetailData(itemId, itemData));
      }
      if (options.fetch !== false) {
        void fetchHoverDetail(itemId);
      }
    },
    [fetchHoverDetail, getPosition]
  );

  const handleItemHover = useCallback(
    (
      itemId: string,
      element: HTMLElement,
      itemData?: ComboboxHoverDetailSourceData,
      options: { immediate?: boolean } = {}
    ) => {
      if (!isEnabled) return;

      clearHoverDetailTimeouts();
      currentItemIdRef.current = itemId;

      if (options.immediate) {
        commitHoverDetail(itemId, element, itemData);
        return;
      }

      if (isPortalShownRef.current) {
        switchTimeoutRef.current = setTimeout(() => {
          switchTimeoutRef.current = null;
          commitHoverDetail(itemId, element, itemData);
        }, hoverDetailSwitchDelay);
        return;
      }

      setPosition(getPosition(element));
      if (itemData) {
        setData(getHoverDetailData(itemId, itemData));
      }

      showTimeoutRef.current = setTimeout(() => {
        if (currentItemIdRef.current !== itemId) return;

        commitHoverDetail(itemId, element, itemData);
      }, hoverDelay);
    },
    [
      clearHoverDetailTimeouts,
      commitHoverDetail,
      getPosition,
      hoverDelay,
      isEnabled,
    ]
  );

  const syncHighlightedHoverDetail = useCallback(
    (
      itemId: string,
      element: HTMLElement,
      itemData?: ComboboxHoverDetailSourceData,
      options: { show?: boolean } = {}
    ) => {
      if (!isEnabled) return;

      clearHoverDetailTimeouts();
      if (!isPortalShownRef.current && options.show !== true) {
        currentAnchorElementRef.current = null;
        currentItemIdRef.current = null;
        setData(null);
        return;
      }

      const previousItemId = currentItemIdRef.current;
      currentItemIdRef.current = itemId;
      commitHoverDetail(itemId, element, itemData, {
        fetch: previousItemId !== itemId,
      });
    },
    [clearHoverDetailTimeouts, commitHoverDetail, isEnabled]
  );

  const cancelPendingHoverDetail = useCallback(() => {
    if (!isEnabled) return;

    clearHoverDetailTimeouts();
    if (isPortalShownRef.current) return;

    currentAnchorElementRef.current = null;
    currentItemIdRef.current = null;
    setData(null);
  }, [clearHoverDetailTimeouts, isEnabled]);

  const suspendHoverDetailForBoundaryScroll = useCallback(() => {
    if (!isEnabled || !isPortalShownRef.current) return;

    clearHoverDetailTimeouts();
    setIsVisible(false);

    scrollResumeTimeoutRef.current = setTimeout(() => {
      scrollResumeTimeoutRef.current = null;

      const anchorElement = currentAnchorElementRef.current;
      if (
        !isEnabled ||
        !isComboboxOpen ||
        !anchorElement?.isConnected ||
        !currentItemIdRef.current ||
        !isAnchorFullyInsideBoundary(anchorElement)
      ) {
        isPortalShownRef.current = false;
        return;
      }

      setPosition(getPosition(anchorElement));
      setIsVisible(true);
    }, hoverDetailScrollResumeDelay);
  }, [
    clearHoverDetailTimeouts,
    getPosition,
    isAnchorFullyInsideBoundary,
    isComboboxOpen,
    isEnabled,
  ]);

  const handleItemLeave = useCallback(() => {
    if (!isEnabled) return;

    clearHoverDetailTimeouts();
    currentItemIdRef.current = null;

    if (!isPortalShownRef.current) {
      currentAnchorElementRef.current = null;
      setData(null);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      isPortalShownRef.current = false;
      currentAnchorElementRef.current = null;
      setIsVisible(false);
      scheduleDataClear();
    }, hoverDetailHideDelay);
  }, [clearHoverDetailTimeouts, isEnabled, scheduleDataClear]);

  const hidePopover = useCallback(() => {
    clearHoverDetailTimeouts();
    cancelPositionUpdateFrame();
    isPortalShownRef.current = false;
    currentAnchorElementRef.current = null;
    currentItemIdRef.current = null;
    setIsVisible(false);
    scheduleDataClear();
  }, [cancelPositionUpdateFrame, clearHoverDetailTimeouts, scheduleDataClear]);

  useEffect(() => {
    if (!isEnabled || !isComboboxOpen || typeof window === 'undefined') {
      return;
    }

    const handleScroll = (event: Event) => {
      if (isBoundaryScrollEvent(event)) {
        suspendHoverDetailForBoundaryScroll();
        return;
      }

      schedulePositionUpdate();
    };

    window.addEventListener('resize', schedulePositionUpdate);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', schedulePositionUpdate);
      window.removeEventListener('scroll', handleScroll, true);
      cancelPositionUpdateFrame();
    };
  }, [
    cancelPositionUpdateFrame,
    isBoundaryScrollEvent,
    isComboboxOpen,
    isEnabled,
    schedulePositionUpdate,
    suspendHoverDetailForBoundaryScroll,
  ]);

  useEffect(() => {
    if (!isComboboxOpen && isVisible) {
      hidePopover();
    }
  }, [hidePopover, isComboboxOpen, isVisible]);

  useEffect(() => {
    if (isEnabled) return;

    clearHoverDetailTimeouts();
    cancelPositionUpdateFrame();
    currentAnchorElementRef.current = null;
    currentItemIdRef.current = null;
    isPortalShownRef.current = false;
    setIsVisible(false);
    setData(null);
  }, [cancelPositionUpdateFrame, clearHoverDetailTimeouts, isEnabled]);

  useEffect(() => {
    return () => {
      clearHoverDetailTimeouts();
      cancelPositionUpdateFrame();
      currentAnchorElementRef.current = null;
      currentItemIdRef.current = null;
      isPortalShownRef.current = false;
    };
  }, [cancelPositionUpdateFrame, clearHoverDetailTimeouts]);

  return {
    data,
    cancelPendingHoverDetail,
    handleItemHover,
    handleItemLeave,
    hidePopover,
    isVisible,
    position,
    syncHighlightedHoverDetail,
  };
};
