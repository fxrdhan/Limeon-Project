import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import '@/features/item-management/presentation/organisms/styles/scrollbar.scss';
import { FaHistory } from 'react-icons/fa';
import { IoArrowUndo } from 'react-icons/io5';
import { formatDateTime } from '@/lib/formatters';

export interface HistoryItem {
  id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_fields?: Record<string, unknown>;
}

interface HistoryTimelineListProps {
  history: HistoryItem[] | null;
  isLoading: boolean;
  onVersionClick: (item: HistoryItem) => void;
  selectedVersions?: number[];
  selectedVersion?: number | null;
  showRestoreButton?: boolean;
  onRestore?: (version: number) => void;
  emptyMessage?: string;
  loadingMessage?: string;
  // New props for dual comparison
  allowMultiSelect?: boolean;
  onCompareSelected?: (versions: HistoryItem[]) => void;
  maxSelections?: number;
  onSelectionEmpty?: () => void;
  isFlipped?: boolean;
}

interface HistoryItemCardProps {
  item: HistoryItem;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  allowMultiSelect: boolean;
  selectedForCompare: HistoryItem[];
  isFlipped: boolean;
  latestVersion: number;
  showRestoreButton: boolean;
  hoveredItem: string | null;
  bgColor: string;
  onMouseEnter: (itemId: string) => void;
  onMouseLeave: () => void;
  onClick: (item: HistoryItem) => void;
  onRestore?: (version: number) => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  item,
  index,
  isSelected,
  isExpanded,
  isFirst,
  isLast,
  allowMultiSelect,
  selectedForCompare,
  isFlipped,
  latestVersion,
  showRestoreButton,
  bgColor,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onRestore,
}) => {
  const isPresent = useIsPresent();

  const handleRestore = (e: React.MouseEvent, version: number) => {
    e.stopPropagation();
    if (onRestore) {
      onRestore(version);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30,
          delay: index * 0.08,
        },
      }}
      exit={{
        opacity: 0,
        y: -10,
        transition: {
          duration: 0.2,
        },
      }}
      style={{
        position: isPresent ? 'static' : 'absolute',
        willChange: 'transform', // Force GPU layer
        backfaceVisibility: 'hidden' as const,
      }}
      className={`relative ${isFirst ? 'pt-2' : ''} ${isLast ? 'pb-2' : ''}`}
      data-version-number={item.version_number}
    >
      {/* Simple bullet - use CSS only, no transform */}
      <span
        className={`absolute left-0 top-5 w-3 h-3 rounded-full transition-colors duration-200 block ${
          isSelected
            ? allowMultiSelect
              ? (() => {
                  const selectionIndex = selectedForCompare.findIndex(
                    s => s.id === item.id
                  );
                  if (selectionIndex >= 0) {
                    if (isFlipped) {
                      return selectionIndex === 0
                        ? 'border-2 border-purple-300 bg-purple-300'
                        : 'border-2 border-blue-300 bg-blue-300';
                    } else {
                      return selectionIndex === 0
                        ? 'border-2 border-blue-300 bg-blue-300'
                        : 'border-2 border-purple-300 bg-purple-300';
                    }
                  }
                  return 'border-2 border-gray-300 bg-white';
                })()
              : 'border-2 border-blue-300 bg-blue-300'
            : 'border-2 border-gray-300 bg-white'
        }`}
      />

      <div
        className={`ml-6 py-3 px-4 cursor-pointer transition-all duration-200 rounded-lg ${bgColor} ${
          isExpanded ? 'shadow-md' : ''
        } border border-gray-200 hover:border-gray-300`}
        onMouseEnter={() => onMouseEnter(item.id)}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(item)}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                item.action_type === 'INSERT'
                  ? 'bg-green-100 text-green-700'
                  : item.action_type === 'UPDATE'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {item.action_type}
            </span>
            <span className="text-gray-500 text-xs">
              {formatDateTime(item.changed_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Version badge that transforms into restore button on hover */}
            {showRestoreButton &&
            item.version_number < latestVersion &&
            onRestore ? (
              <button
                onClick={e => {
                  e.stopPropagation(); // Prevent timeline item click
                  handleRestore(e, item.version_number);
                }}
                className="
                  relative
                  group
                  text-xs px-2 py-1 rounded
                  flex items-center justify-center
                  min-w-[2.5rem]
                  transition-all duration-300 ease-in-out
                  bg-purple-100 hover:bg-orange-50
                  text-purple-700 hover:text-orange-600
                  cursor-pointer
                "
                title="Restore ke versi ini"
              >
                {/* Version text - visible by default, fade out on hover */}
                <span className="transition-opacity duration-300 ease-in-out group-hover:opacity-0">
                  v{item.version_number}
                </span>

                {/* Restore icon - hidden by default, fade in on hover */}
                <IoArrowUndo
                  className="
                    absolute inset-0 m-auto
                    opacity-0
                    transition-opacity duration-300 ease-in-out
                    group-hover:opacity-100
                  "
                  size={14}
                />
              </button>
            ) : (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                v{item.version_number}
              </span>
            )}
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded && item.changed_fields
              ? 'max-h-24 opacity-100 mt-3'
              : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          {item.changed_fields && (
            <div className="text-xs p-3 rounded-lg border transition-all duration-300 bg-gray-50 border-gray-200 text-gray-600">
              <span className="font-medium">Changed fields:</span>{' '}
              {Object.keys(item.changed_fields).join(', ')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const HistoryTimelineList: React.FC<HistoryTimelineListProps> = ({
  history,
  isLoading,
  onVersionClick,
  selectedVersions = [],
  selectedVersion = null,
  showRestoreButton = false,
  onRestore,
  emptyMessage = 'Tidak ada riwayat perubahan',
  loadingMessage = 'Loading history...',
  allowMultiSelect = false,
  onCompareSelected,
  maxSelections = 2,
  onSelectionEmpty,
  isFlipped = false,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });
  const [selectedForCompare, setSelectedForCompare] = useState<HistoryItem[]>(
    []
  );
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const targetScrollRef = useRef<number>(0);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find the latest version number (current version should not have restore button)
  const latestVersion = history
    ? Math.max(...history.map(h => h.version_number))
    : 0;

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Use a threshold of 5px to account for sub-pixel rendering and rounding
    const threshold = 5;
    const canScrollUp = scrollTop > threshold;
    const canScrollDown = scrollTop < scrollHeight - clientHeight - threshold;

    setScrollState({ canScrollUp, canScrollDown });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check initial scroll position immediately
    checkScrollPosition();

    // Check again after a short delay to ensure animations have completed
    const timeoutId = setTimeout(checkScrollPosition, 100);

    // Handle scrolling state for hover prevention during scroll
    const handleScroll = () => {
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      // Reset scrolling state after 150ms of no scroll
      scrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Also call original check
      checkScrollPosition();
    };

    // Add scroll listener
    container.addEventListener('scroll', handleScroll);

    // Check when content changes
    const resizeObserver = new ResizeObserver(() => {
      checkScrollPosition();
      // Double-check after resize completes
      setTimeout(checkScrollPosition, 50);
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, [history]);

  // Clear selection state when allowMultiSelect changes
  useEffect(() => {
    setSelectedForCompare([]);
  }, [allowMultiSelect]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Custom smooth scrolling effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initialize target scroll to current position
    targetScrollRef.current = container.scrollTop;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Cancel any ongoing animation
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }

      // Update target scroll position with damping (reduce scroll speed)
      const scrollSpeed = 0.5; // Lower = slower, smoother scrolling
      targetScrollRef.current += e.deltaY * scrollSpeed;

      // Clamp to valid scroll range
      const maxScroll = container.scrollHeight - container.clientHeight;
      targetScrollRef.current = Math.max(
        0,
        Math.min(targetScrollRef.current, maxScroll)
      );

      // Smooth animation function
      const smoothScroll = () => {
        const current = container.scrollTop;
        const target = targetScrollRef.current;
        const diff = target - current;

        // Easing factor (lower = smoother, more buttery)
        const easingFactor = 0.15;

        // If difference is very small, snap to target
        if (Math.abs(diff) < 0.1) {
          container.scrollTop = target;
          scrollAnimationRef.current = null;
          return;
        }

        // Apply easing
        container.scrollTop += diff * easingFactor;

        // Continue animation
        scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
      };

      // Start animation
      smoothScroll();
    };

    // Add passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (itemId: string) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set new timeout for 150ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(itemId);
    }, 150);
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before delay completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Immediately remove hover state
    setHoveredItem(null);
  };

  const handleItemClick = (item: HistoryItem) => {
    if (allowMultiSelect) {
      const isSelected = selectedForCompare.find(s => s.id === item.id);
      if (isSelected) {
        // Remove from selection
        const newSelection = selectedForCompare.filter(s => s.id !== item.id);
        setSelectedForCompare(newSelection);

        // Trigger callback for any selection change
        if (newSelection.length === 0 && onSelectionEmpty) {
          onSelectionEmpty();
        } else if (onCompareSelected) {
          onCompareSelected(newSelection);
        }
      } else if (selectedForCompare.length < maxSelections) {
        // Add to selection
        const newSelection = [...selectedForCompare, item];
        setSelectedForCompare(newSelection);

        // Trigger callback for any selection change
        if (onCompareSelected) {
          onCompareSelected(newSelection);
        }
      } else {
        // Replace oldest selection
        const newSelection = [...selectedForCompare.slice(1), item];
        setSelectedForCompare(newSelection);

        // Trigger callback for any selection change
        if (onCompareSelected) {
          onCompareSelected(newSelection);
        }
      }
    } else {
      onVersionClick(item);
    }
  };

  const isItemSelected = (item: HistoryItem): boolean => {
    if (allowMultiSelect) {
      return selectedForCompare.some(s => s.id === item.id);
    }
    return (
      selectedVersions.includes(item.version_number) ||
      selectedVersion === item.version_number
    );
  };

  const getItemBgColor = (item: HistoryItem): string => {
    if (allowMultiSelect) {
      const selectionIndex = selectedForCompare.findIndex(
        s => s.id === item.id
      );
      if (selectionIndex >= 0) {
        // Apply flip logic: if flipped, swap the colors
        if (isFlipped) {
          return selectionIndex === 0 ? 'bg-purple-50' : 'bg-blue-50';
        } else {
          return selectionIndex === 0 ? 'bg-blue-50' : 'bg-purple-50';
        }
      }
      return 'hover:bg-gray-50';
    }

    if (selectedVersions.includes(item.version_number)) {
      return 'bg-blue-50';
    }
    if (selectedVersion === item.version_number) {
      return 'bg-green-50';
    }
    return 'hover:bg-gray-50';
  };

  // Only show empty state when no history exists (not loading)
  if (!history || history.length === 0) {
    // Show loading spinner only if currently loading AND no data yet
    if (isLoading) {
      return (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">{loadingMessage}</p>
        </div>
      );
    }

    // Show empty state when no data and not loading
    return (
      <div className="p-6 text-center text-gray-500">
        <FaHistory size={48} className="mx-auto mb-4 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative">
        {/* Fixed timeline line - doesn't scroll */}
        <div className="absolute left-[5.4px] top-8 bottom-0 w-0.5 bg-gray-300 opacity-50 z-0" />

        {/* Top fade overlay */}
        {scrollState.canScrollUp && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        {/* Bottom fade overlay */}
        {scrollState.canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={scrollContainerRef}
          className="relative space-y-3 max-h-96 overflow-y-auto history-scrollbar-hidden"
        >
          <AnimatePresence mode="popLayout">
            {history.map((item, index) => {
              const isSelected = isItemSelected(item);
              const isExpanded =
                isSelected || (!isScrolling && hoveredItem === item.id);
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
                  hoveredItem={hoveredItem}
                  bgColor={getItemBgColor(item)}
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
