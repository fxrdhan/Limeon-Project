import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import '@/features/item-management/presentation/organisms/styles/scrollbar.scss';
import { TbHistory } from 'react-icons/tb';
import { HistoryItemCard } from './history-timeline-list/HistoryItemCard';
import { HistoryTimelineSkeleton } from './history-timeline-list/HistoryTimelineSkeleton';
import {
  getHistoryTimelineItemBgColor,
  getNextHistoryCompareSelection,
  isHistoryTimelineItemSelected,
} from './history-timeline-list/historySelection';
import type {
  HistoryItem,
  HistoryTimelineListProps,
} from './history-timeline-list/types';

export type { HistoryItem } from './history-timeline-list/types';

const HistoryTimelineList = ({
  history,
  isLoading,
  onVersionClick,
  selectedVersions = [],
  selectedVersion = null,
  showRestoreButton = false,
  onRestore,
  emptyMessage = 'Tidak ada riwayat perubahan',
  allowMultiSelect = false,
  onCompareSelected,
  maxSelections = 2,
  onSelectionEmpty,
  isFlipped = false,
  autoScrollToSelected = true,
  skipEntranceAnimation = false,
  scrollContainerMaxHeight,
  disableHoverDetails = false,
  showExpandedRestoreActions = false,
}: HistoryTimelineListProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });
  const [compareState, setCompareState] = useState<{
    allowMultiSelect: boolean;
    selected: HistoryItem[];
  }>({
    allowMultiSelect: false,
    selected: [],
  });
  if (allowMultiSelect !== compareState.allowMultiSelect) {
    setCompareState({ allowMultiSelect, selected: [] });
  }
  const selectedForCompare = compareState.selected;
  const setSelectedForCompare = (items: HistoryItem[]) => {
    setCompareState(prev => ({ ...prev, selected: items }));
  };
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const targetScrollRef = useRef<number>(0);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const latestVersion = history
    ? Math.max(...history.map(item => item.version_number))
    : 0;

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    const threshold = 5;
    const canScrollUp = scrollTop > threshold;
    const canScrollDown = scrollTop < scrollHeight - clientHeight - threshold;

    setScrollState(prev => {
      if (
        prev.canScrollUp === canScrollUp &&
        prev.canScrollDown === canScrollDown
      ) {
        return prev;
      }
      return { canScrollUp, canScrollDown };
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();

    const timeoutId = setTimeout(checkScrollPosition, 100);

    let scrollCheckRaf: number | null = null;
    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      scrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      if (scrollCheckRaf !== null) return;
      scrollCheckRaf = requestAnimationFrame(() => {
        scrollCheckRaf = null;
        checkScrollPosition();
      });
    };

    container.addEventListener('scroll', handleScroll);

    let resizeRaf: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        checkScrollPosition();
        setTimeout(checkScrollPosition, 50);
      });
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollCheckRaf !== null) {
        cancelAnimationFrame(scrollCheckRaf);
      }
      if (resizeRaf !== null) {
        cancelAnimationFrame(resizeRaf);
      }
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, [history]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedVersion || !autoScrollToSelected || allowMultiSelect) {
      return;
    }

    const scrollSelectedIntoView = (behavior: ScrollBehavior) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const element = container.querySelector<HTMLElement>(
        `[data-version-number="${selectedVersion}"]`
      );
      if (!element) return;

      const scrollMargin = Math.min(
        40,
        Math.max(16, container.clientHeight * 0.12)
      );
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const visibleTop = containerRect.top + scrollMargin;
      const visibleBottom = containerRect.bottom - scrollMargin;
      const maxScroll = container.scrollHeight - container.clientHeight;
      let nextScrollTop = container.scrollTop;

      if (elementRect.top < visibleTop) {
        nextScrollTop += elementRect.top - visibleTop;
      } else if (elementRect.bottom > visibleBottom) {
        nextScrollTop += elementRect.bottom - visibleBottom;
      }

      nextScrollTop = Math.max(0, Math.min(nextScrollTop, maxScroll));
      if (Math.abs(nextScrollTop - container.scrollTop) < 1) {
        checkScrollPosition();
        return;
      }

      container.scrollTo({
        top: nextScrollTop,
        behavior,
      });
    };

    const animationFrame = requestAnimationFrame(() => {
      scrollSelectedIntoView('smooth');
    });
    const settleTimeout = setTimeout(() => {
      scrollSelectedIntoView('smooth');
    }, 260);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(settleTimeout);
    };
  }, [selectedVersion, autoScrollToSelected, allowMultiSelect]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    targetScrollRef.current = container.scrollTop;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }

      const scrollSpeed = 0.5;
      targetScrollRef.current += event.deltaY * scrollSpeed;

      const maxScroll = container.scrollHeight - container.clientHeight;
      targetScrollRef.current = Math.max(
        0,
        Math.min(targetScrollRef.current, maxScroll)
      );

      const smoothScroll = () => {
        const current = container.scrollTop;
        const target = targetScrollRef.current;
        const diff = target - current;
        const easingFactor = 0.15;

        if (Math.abs(diff) < 0.1) {
          container.scrollTop = target;
          scrollAnimationRef.current = null;
          return;
        }

        container.scrollTop += diff * easingFactor;
        scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
      };

      smoothScroll();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (itemId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(itemId);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredItem(null);
  };

  const handleItemClick = (item: HistoryItem) => {
    if (allowMultiSelect) {
      const newSelection = getNextHistoryCompareSelection({
        item,
        maxSelections,
        selectedItems: selectedForCompare,
      });
      setSelectedForCompare(newSelection);

      if (newSelection.length === 0 && onSelectionEmpty) {
        onSelectionEmpty();
      } else if (onCompareSelected) {
        onCompareSelected(newSelection);
      }
    } else {
      onVersionClick(item);
    }
  };

  if (!history || history.length === 0) {
    if (isLoading) {
      return (
        <HistoryTimelineSkeleton
          scrollContainerMaxHeight={scrollContainerMaxHeight}
        />
      );
    }

    return (
      <div className="p-6 text-center text-slate-500">
        <TbHistory size={48} className="mx-auto mb-4 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative">
        <div className="absolute left-[5.4px] top-8 bottom-0 w-0.5 bg-slate-300 opacity-50 z-0" />

        {scrollState.canScrollUp && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        {scrollState.canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={scrollContainerRef}
          className="relative space-y-3 max-h-96 overflow-y-auto history-scrollbar-hidden"
          style={
            scrollContainerMaxHeight
              ? { maxHeight: `${scrollContainerMaxHeight}px` }
              : undefined
          }
        >
          <AnimatePresence mode="popLayout">
            {history.map((item, index) => {
              const selectionOptions = {
                allowMultiSelect,
                item,
                selectedForCompare,
                selectedVersion,
                selectedVersions,
              };
              const isSelected =
                isHistoryTimelineItemSelected(selectionOptions);
              const isExpanded =
                isSelected ||
                (!disableHoverDetails &&
                  !isScrolling &&
                  hoveredItem === item.id);
              const isFirst = index === 0;
              const isLast = index === history.length - 1;

              return (
                <HistoryItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  isFirst={isFirst}
                  isLast={isLast}
                  allowMultiSelect={allowMultiSelect}
                  selectedForCompare={selectedForCompare}
                  isFlipped={isFlipped}
                  latestVersion={latestVersion}
                  showRestoreButton={showRestoreButton}
                  bgColor={getHistoryTimelineItemBgColor(selectionOptions)}
                  skipEntranceAnimation={skipEntranceAnimation}
                  showExpandedRestoreActions={showExpandedRestoreActions}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleItemClick}
                  onRestore={onRestore}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HistoryTimelineList;
