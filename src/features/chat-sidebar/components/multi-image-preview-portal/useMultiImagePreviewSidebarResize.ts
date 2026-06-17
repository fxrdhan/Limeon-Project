import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  getDefaultSidebarWidth,
  INITIAL_CONTAINER_HEIGHT,
  MAX_SIDEBAR_WIDTH,
  MIN_PREVIEW_PANE_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_LAYOUT_LEVELS,
} from './sidebarLayout';

interface UseMultiImagePreviewSidebarResizeProps {
  isOpen: boolean;
  itemCount: number;
}

const DEFAULT_SIDEBAR_LAYOUT_LEVEL = SIDEBAR_LAYOUT_LEVELS[0];
if (!DEFAULT_SIDEBAR_LAYOUT_LEVEL) {
  throw new Error('Sidebar layout levels must define a default level.');
}

export const useMultiImagePreviewSidebarResize = ({
  isOpen,
  itemCount,
}: UseMultiImagePreviewSidebarResizeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
  const resizeStateRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(1180);
  const [containerHeight, setContainerHeight] = useState(
    INITIAL_CONTAINER_HEIGHT
  );
  const didUserAdjustSidebarRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    getDefaultSidebarWidth(itemCount, INITIAL_CONTAINER_HEIGHT)
  );
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const getMaxSidebarWidth = useCallback((availableWidth: number) => {
    return Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, availableWidth - MIN_PREVIEW_PANE_WIDTH)
    );
  }, []);

  const clampSidebarWidth = useCallback(
    (nextWidth: number, availableWidth: number) => {
      const maxSidebarWidth = getMaxSidebarWidth(availableWidth);

      return Math.min(Math.max(nextWidth, MIN_SIDEBAR_WIDTH), maxSidebarWidth);
    },
    [getMaxSidebarWidth]
  );

  const getSnappedSidebarWidth = useCallback(
    (nextWidth: number, availableWidth: number) => {
      const boundedWidth = clampSidebarWidth(nextWidth, availableWidth);
      const maxSidebarWidth = getMaxSidebarWidth(availableWidth);
      const snapCandidates = SIDEBAR_LAYOUT_LEVELS.map(
        level => level.width
      ).filter(width => width <= maxSidebarWidth);

      return snapCandidates.reduce(
        (closestWidth, candidateWidth) => {
          return Math.abs(candidateWidth - boundedWidth) <
            Math.abs(closestWidth - boundedWidth)
            ? candidateWidth
            : closestWidth;
        },
        Math.min(maxSidebarWidth, snapCandidates[0] ?? boundedWidth)
      );
    },
    [clampSidebarWidth, getMaxSidebarWidth]
  );

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      const nextEntry = entries[0];
      const nextWidth = nextEntry?.contentRect.width;
      if (!nextWidth) {
        return;
      }

      setContainerWidth(nextWidth);
      setContainerHeight(nextEntry.contentRect.height);
    });

    const containerRect = containerElement.getBoundingClientRect();
    setContainerWidth(containerRect.width);
    setContainerHeight(containerRect.height);
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    setSidebarWidth(currentWidth => {
      const snappedWidth = getSnappedSidebarWidth(currentWidth, containerWidth);
      return snappedWidth === currentWidth ? currentWidth : snappedWidth;
    });
  }, [containerWidth, getSnappedSidebarWidth]);

  const stopSidebarResize = useCallback(
    (target?: HTMLButtonElement | null, pointerId?: number) => {
      if (
        target &&
        pointerId !== undefined &&
        target.hasPointerCapture(pointerId)
      ) {
        target.releasePointerCapture(pointerId);
      }

      resizeStateRef.current = null;
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      return;
    }

    didUserAdjustSidebarRef.current = false;
    stopSidebarResize(resizeHandleRef.current);
  }, [isOpen, stopSidebarResize]);

  useEffect(() => {
    if (didUserAdjustSidebarRef.current) {
      return;
    }

    setSidebarWidth(getDefaultSidebarWidth(itemCount, containerHeight));
  }, [containerHeight, itemCount]);

  useEffect(() => {
    const resizeHandleElement = resizeHandleRef.current;

    return () => {
      stopSidebarResize(resizeHandleElement);
    };
  }, [stopSidebarResize]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      const boundedWidth = getSnappedSidebarWidth(sidebarWidth, containerWidth);

      event.preventDefault();
      resizeStateRef.current = {
        pointerId: event.pointerId,
        startWidth: boundedWidth,
        startX: event.clientX,
      };
      didUserAdjustSidebarRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setSidebarWidth(boundedWidth);
      setIsResizingSidebar(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [containerWidth, getSnappedSidebarWidth, sidebarWidth]
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) {
        return;
      }

      const widthDelta = event.clientX - resizeState.startX;
      setSidebarWidth(
        getSnappedSidebarWidth(
          resizeState.startWidth + widthDelta,
          containerWidth
        )
      );
    },
    [containerWidth, getSnappedSidebarWidth]
  );

  const handleResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (resizeStateRef.current?.pointerId !== event.pointerId) {
        return;
      }

      stopSidebarResize(event.currentTarget, event.pointerId);
    },
    [stopSidebarResize]
  );

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      didUserAdjustSidebarRef.current = true;
      setSidebarWidth(currentWidth => {
        const maxSidebarWidth = getMaxSidebarWidth(containerWidth);
        const snapCandidates = SIDEBAR_LAYOUT_LEVELS.map(
          level => level.width
        ).filter(width => width <= maxSidebarWidth);
        const activeIndex = snapCandidates.findIndex(
          width => width === currentWidth
        );
        const currentIndex = activeIndex === -1 ? 0 : activeIndex;
        const nextIndex =
          event.key === 'ArrowLeft'
            ? Math.max(0, currentIndex - 1)
            : Math.min(snapCandidates.length - 1, currentIndex + 1);

        return (
          snapCandidates[nextIndex] ?? Math.min(maxSidebarWidth, currentWidth)
        );
      });
    },
    [containerWidth, getMaxSidebarWidth]
  );

  const boundedSidebarWidth = getSnappedSidebarWidth(
    sidebarWidth,
    containerWidth
  );
  const maxSidebarWidth = getMaxSidebarWidth(containerWidth);
  const activeLayoutLevel =
    SIDEBAR_LAYOUT_LEVELS.find(level => level.width === boundedSidebarWidth) ??
    DEFAULT_SIDEBAR_LAYOUT_LEVEL;
  const sidebarColumnCount = activeLayoutLevel.columnCount;
  const containerStyle = {
    '--multi-image-preview-sidebar-width': `${boundedSidebarWidth}px`,
  } as CSSProperties;

  return {
    activeLayoutLevel,
    boundedSidebarWidth,
    containerRef,
    containerStyle,
    handleResizeKeyDown,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    isResizingSidebar,
    maxSidebarWidth,
    resizeHandleRef,
    sidebarColumnCount,
  };
};
