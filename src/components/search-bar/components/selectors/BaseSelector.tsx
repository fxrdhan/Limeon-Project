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
}: BaseSelectorProps<T>) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHeader, setShowHeader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (filteredItems.length > 0 && selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    } else if (filteredItems.length === 0) {
      setSelectedIndex(0);
    }
  }, [filteredItems.length, selectedIndex]);

  useEffect(() => {
    if (isOpen && !showHeader) {
      setShowHeader(true);
      setTimeout(() => {
        setShowContent(true);
      }, 200);
    } else if (!isOpen && (showHeader || showContent)) {
      setShowContent(false);
      setTimeout(() => {
        setShowHeader(false);
      }, 200);
    }
  }, [isOpen, showHeader, showContent]);

  useEffect(() => {
    if (!isOpen) {
      setShowHeader(false);
      setShowContent(false);
    }
  }, [isOpen]);

  const searchFieldsConfig = useMemo(() => {
    if (items.length === 0) return [];
    return config.getSearchFields(items[0]);
  }, [items, config]);

  useEffect(() => {
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

      const filtered = Array.from(allResults.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.item);

      setFilteredItems(filtered);
      setSelectedIndex(prev => (prev >= filtered.length ? 0 : prev));
    } else {
      setFilteredItems(items);
      setSelectedIndex(prev => (prev >= items.length ? 0 : prev));
    }
  }, [searchTerm, items, searchFieldsConfig, config]);

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
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen, filteredItems]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        if (isOpen) {
          setShowContent(false);
          setTimeout(() => {
            setShowHeader(false);
          }, 200);
          setTimeout(() => {
            onClose();
          }, 350);
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
                  duration: 0.25,
                  ease: 'easeInOut',
                }}
              >
                <div className="max-h-65 overflow-y-auto py-1">
                  {filteredItems.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      {config.noResultsText.replace('{searchTerm}', searchTerm)}
                    </div>
                  ) : (
                    <div className="pb-1">
                      {filteredItems.map((item, index) => (
                        <div
                          key={config.getItemKey(item)}
                          ref={el => {
                            itemRefs.current[index] = el;
                          }}
                          className={`px-3 py-2 cursor-pointer flex items-start gap-3 mx-1 rounded-md transition-all duration-200 ease-out ${
                            index === selectedIndex
                              ? config.theme === 'blue'
                                ? 'bg-blue-100'
                                : 'bg-purple-100'
                              : 'bg-transparent hover:bg-gray-50'
                          }`}
                          onClick={() => onSelect(item)}
                        >
                          <div className="shrink-0 mt-0.5">
                            {config.getItemIcon(item)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
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
