import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find the latest version number (current version should not have restore button)
  const latestVersion = history
    ? Math.max(...history.map(h => h.version_number))
    : 0;

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop < scrollHeight - clientHeight - 1;

    setScrollState({ canScrollUp, canScrollDown });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check initial scroll position
    checkScrollPosition();

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition);

    // Check when content changes
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
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

  const handleRestore = (e: React.MouseEvent, version: number) => {
    e.stopPropagation();
    if (onRestore) {
      onRestore(version);
    }
  };

  const handleItemClick = (item: HistoryItem) => {
    if (allowMultiSelect) {
      const isSelected = selectedForCompare.find(s => s.id === item.id);
      if (isSelected) {
        // Remove from selection
        const newSelection = selectedForCompare.filter(s => s.id !== item.id);
        setSelectedForCompare(newSelection);

        // Auto-close comparison when no versions are selected
        if (newSelection.length === 0 && onSelectionEmpty) {
          onSelectionEmpty();
        }
      } else if (selectedForCompare.length < maxSelections) {
        // Add to selection
        const newSelection = [...selectedForCompare, item];
        setSelectedForCompare(newSelection);

        // Auto-trigger comparison when exactly 2 versions are selected
        if (newSelection.length === 2 && onCompareSelected) {
          onCompareSelected(newSelection);
        }
      } else {
        // Replace oldest selection
        const newSelection = [...selectedForCompare.slice(1), item];
        setSelectedForCompare(newSelection);

        // Auto-trigger comparison when exactly 2 versions are selected
        if (newSelection.length === 2 && onCompareSelected) {
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
          className="relative space-y-3 max-h-96 overflow-y-auto scrollbar-gutter-stable"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {history.map((item, index) => {
              const isSelected = isItemSelected(item);
              const isExpanded = isSelected || hoveredItem === item.id;
              const isFirst = index === 0;
              const isLast = index === history.length - 1;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 1,
                    layout: { duration: 0.3 },
                  }}
                  className={`relative ${isFirst ? 'pt-2' : ''} ${isLast ? 'pb-2' : ''}`}
                >
                  {/* Simple bullet */}
                  <div
                    className={`absolute left-0 w-3 h-3 rounded-full transition-all duration-200 ${
                      isSelected
                        ? allowMultiSelect
                          ? (() => {
                              const selectionIndex =
                                selectedForCompare.findIndex(
                                  s => s.id === item.id
                                );
                              if (selectionIndex >= 0) {
                                // Apply flip logic for bullet colors too
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
                    } ${isExpanded ? 'top-5' : 'top-5'}`}
                  />

                  <div
                    className={`ml-6 py-3 px-4 cursor-pointer transition-all duration-200 rounded-lg ${getItemBgColor(
                      item
                    )} ${
                      isExpanded ? 'shadow-md' : ''
                    } border border-gray-200 hover:border-gray-300`}
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleItemClick(item)}
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
                              font-mono text-xs px-2 py-1 rounded
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
                          <span className="font-mono text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
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
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HistoryTimelineList;
