import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles } from 'react-icons/hi2';
import fuzzysort from 'fuzzysort';
import { BaseSelectorProps } from '../../types';
import { SEARCH_CONSTANTS } from '../../constants';

function BaseSelector<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
  config,
  defaultSelectedIndex,
}: BaseSelectorProps<T>) {
  // Removed filteredItems state - will derive it with useMemo instead
  const [showHeader, setShowHeader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Track selected item position for sliding background
  const [indicatorStyle, setIndicatorStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const searchFieldsConfig = useMemo(() => {
    if (items.length === 0) return [];
    return config.getSearchFields(items[0]);
  }, [items, config]);

  // Derive filteredItems using useMemo instead of effect + state
  const filteredItems = useMemo(() => {
    if (searchTerm && items.length > 0) {
      const searchTargets = items.map(item => {
        const searchFields = config.getSearchFields(item);
        return {
          item,
          ...searchFields.reduce(
            (acc, field) => ({ ...acc, [field.key]: field.value }),
            {}
          ),
        };
      });

      const allResults = new Map<string, { item: T; score: number }>();

      searchFieldsConfig.forEach(fieldConfig => {
        const results = fuzzysort.go(searchTerm, searchTargets, {
          key: fieldConfig.key,
          threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
        });

        results.forEach(result => {
          const itemKey = config.getItemKey(result.obj.item);
          const boost = fieldConfig.boost || 0;
          const currentBest = allResults.get(itemKey);

          if (!currentBest || result.score + boost > currentBest.score) {
            allResults.set(itemKey, {
              item: result.obj.item,
              score: result.score + boost,
            });
          }
        });
      });

      return Array.from(allResults.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.item);
    } else {
      return items;
    }
  }, [searchTerm, items, searchFieldsConfig, config]);

  // Use getDerivedStateFromProps pattern to manage selectedIndex resets
  const [indexState, setIndexState] = useState({
    isOpen: false,
    filteredLength: 0,
    selectedIndex: 0,
  });

  if (
    isOpen !== indexState.isOpen ||
    filteredItems.length !== indexState.filteredLength
  ) {
    let newIndex = indexState.selectedIndex;

    // Reset to defaultSelectedIndex (or 0) when opening
    if (isOpen && !indexState.isOpen) {
      newIndex = defaultSelectedIndex ?? 0;
    }
    // Adjust if out of bounds
    else if (
      filteredItems.length > 0 &&
      indexState.selectedIndex >= filteredItems.length
    ) {
      newIndex = Math.max(0, filteredItems.length - 1);
    } else if (filteredItems.length === 0) {
      newIndex = 0;
    }

    setIndexState({
      isOpen,
      filteredLength: filteredItems.length,
      selectedIndex: newIndex,
    });
  }

  const selectedIndex = indexState.selectedIndex;
  const setSelectedIndex = (value: number | ((prev: number) => number)) => {
    setIndexState(prev => ({
      ...prev,
      selectedIndex:
        typeof value === 'function' ? value(prev.selectedIndex) : value,
    }));
  };

  useEffect(() => {
    if (isOpen && !showHeader) {
      // Move all setState to async to avoid synchronous setState in effect
      setTimeout(() => {
        setShowHeader(true);
      }, 0);
      setTimeout(() => {
        setShowContent(true);
      }, 50); // Reduced from 200ms to 50ms
    } else if (!isOpen && (showHeader || showContent)) {
      // Move all setState to async
      setTimeout(() => {
        setShowContent(false);
      }, 0);
      setTimeout(() => {
        setShowHeader(false);
      }, 100); // Reduced from 200ms to 100ms
    }
  }, [isOpen, showHeader, showContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || filteredItems.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const nextIndex = prev + 1;
            return nextIndex >= filteredItems.length ? 0 : nextIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            return prev === 0 ? filteredItems.length - 1 : prev - 1;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (
            selectedIndex >= 0 &&
            selectedIndex < filteredItems.length &&
            filteredItems[selectedIndex]
          ) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex] && listContainerRef.current) {
      const container = listContainerRef.current;
      const selectedElement = itemRefs.current[selectedIndex];

      if (!selectedElement) return;

      const isLastItem = selectedIndex === filteredItems.length - 1;
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedElement.getBoundingClientRect();

      const itemTop = selectedElement.offsetTop;
      const itemBottom = itemTop + itemRect.height;
      const containerScrollTop = container.scrollTop;
      const containerHeight = containerRect.height;

      // Check if item is above visible area
      if (itemTop < containerScrollTop) {
        container.scrollTo({
          top: itemTop,
          behavior: 'smooth',
        });
      }
      // Check if item is below visible area
      else if (itemBottom > containerScrollTop + containerHeight) {
        // If it's the last item, scroll to absolute bottom
        if (isLastItem) {
          container.scrollTo({
            top: container.scrollHeight - containerHeight,
            behavior: 'smooth',
          });
        } else {
          container.scrollTo({
            top: itemBottom - containerHeight,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [selectedIndex, isOpen, filteredItems]);

  // Update sliding background position when selectedIndex changes
  useEffect(() => {
    if (
      itemRefs.current[selectedIndex] &&
      listContainerRef.current &&
      filteredItems.length > 0 &&
      showContent
    ) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const selectedElement = itemRefs.current[selectedIndex];
        const containerElement = listContainerRef.current;

        if (selectedElement && containerElement) {
          const containerRect = containerElement.getBoundingClientRect();
          const itemRect = selectedElement.getBoundingClientRect();

          // Shift background slightly upward for better visual alignment
          const verticalOffset = -4; // Move 4px up

          setIndicatorStyle({
            top:
              itemRect.top -
              containerRect.top +
              containerElement.scrollTop +
              verticalOffset,
            left: itemRect.left - containerRect.left,
            width: itemRect.width,
            height: itemRect.height,
          });
        }
      });
    }
  }, [selectedIndex, filteredItems, showContent]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        if (isOpen) {
          // Just call onClose, let the useEffect handle the animation
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] overflow-hidden"
          style={{
            top: position.top + 5,
            left: position.left,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <AnimatePresence>
            {showHeader && (
              <>
                <motion.div
                  className="shrink-0 bg-white border-b border-gray-100 px-3 py-2 rounded-t-lg"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <HiOutlineSparkles className="w-3 h-3" />
                    <span>{config.headerText}</span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showContent && (
              <motion.div
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: 0.1,
                  ease: 'easeOut',
                }}
              >
                <div
                  ref={listContainerRef}
                  className="max-h-65 overflow-y-auto py-1"
                >
                  {filteredItems.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      {config.noResultsText.replace('{searchTerm}', searchTerm)}
                    </div>
                  ) : (
                    <div className="pb-1 relative">
                      {/* Sliding Background Indicator */}
                      <motion.div
                        className={`absolute rounded-md pointer-events-none ${
                          config.theme === 'blue'
                            ? 'bg-blue-100'
                            : 'bg-purple-100'
                        }`}
                        initial={false}
                        animate={{
                          top: indicatorStyle.top,
                          left: indicatorStyle.left,
                          width: indicatorStyle.width,
                          height: indicatorStyle.height,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 30,
                          mass: 0.8,
                        }}
                      />

                      {/* Items */}
                      {filteredItems.map((item, index) => (
                        <div
                          key={config.getItemKey(item)}
                          ref={el => {
                            itemRefs.current[index] = el;
                          }}
                          className="px-3 py-2 cursor-pointer flex items-center gap-3 mx-1 rounded-md relative z-10 hover:bg-gray-50/50 transition-colors duration-150"
                          onClick={() => onSelect(item)}
                        >
                          <div
                            className={`shrink-0 transition-colors duration-150 ${
                              index === selectedIndex
                                ? config.getItemActiveColor?.(item) ||
                                  'text-gray-900'
                                : 'text-gray-400'
                            }`}
                          >
                            {config.getItemIcon(item)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium transition-colors duration-150 ${
                                  index === selectedIndex
                                    ? config.theme === 'blue'
                                      ? 'text-blue-700'
                                      : 'text-purple-700'
                                    : 'text-gray-900'
                                }`}
                              >
                                {config.getItemLabel(item)}
                              </span>
                              {config.getItemSecondaryText && (
                                <span className="text-xs text-gray-400">
                                  {config.getItemSecondaryText(item)}
                                </span>
                              )}
                            </div>
                            {config.getItemDescription &&
                              config.getItemDescription(item) && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {config.getItemDescription(item)}
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showHeader && (
              <motion.div
                className="shrink-0 bg-gray-50 border-t border-gray-100 px-3 py-2 rounded-b-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Enter to select</span>
                  <span>
                    {filteredItems.length}{' '}
                    {config.footerSingular.charAt(0).toUpperCase() +
                      config.footerSingular.slice(1)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BaseSelector;
