import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DROPDOWN_CONSTANTS } from '@/components/dropdown/constants';
import type { VirtualItem } from '@/components/dropdown/internal-types';
import type { DropdownOption } from '@/types';

export const useVirtualOptions = (
  options: DropdownOption[],
  containerRef: RefObject<HTMLDivElement | null>
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const pendingScrollTopRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const shouldVirtualize =
    options.length > DROPDOWN_CONSTANTS.VIRTUALIZATION_THRESHOLD;
  const itemHeight = DROPDOWN_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
  const viewportHeight = DROPDOWN_CONSTANTS.MAX_HEIGHT;
  const totalSize = options.length * itemHeight;

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (!shouldVirtualize) {
      return options.map((option, index) => ({
        index,
        start: index * itemHeight,
        option,
      }));
    }

    const overscan = DROPDOWN_CONSTANTS.VIRTUALIZATION_OVERSCAN;
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      options.length,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    return options.slice(startIndex, endIndex).map((option, offset) => {
      const index = startIndex + offset;
      return { index, start: index * itemHeight, option };
    });
  }, [itemHeight, options, scrollTop, shouldVirtualize, viewportHeight]);

  const handleScroll = useCallback(() => {
    pendingScrollTopRef.current = containerRef.current?.scrollTop ?? 0;

    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      setScrollTop(previousScrollTop =>
        previousScrollTop === pendingScrollTopRef.current
          ? previousScrollTop
          : pendingScrollTopRef.current
      );
    });
  }, [containerRef]);

  const syncScrollTop = useCallback((nextScrollTop: number) => {
    pendingScrollTopRef.current = nextScrollTop;
    setScrollTop(previousScrollTop =>
      previousScrollTop === nextScrollTop ? previousScrollTop : nextScrollTop
    );
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  return {
    handleScroll,
    itemHeight,
    shouldVirtualize,
    syncScrollTop,
    totalSize,
    virtualItems,
  };
};
