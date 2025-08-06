import { useEffect, useRef, useState, useMemo } from 'react';
import { HiOutlineSparkles } from 'react-icons/hi2';
import fuzzysort from 'fuzzysort';
import { BaseSelectorProps } from '../../types';
import { AnimationPhase, SEARCH_CONSTANTS } from '../../constants';

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
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('hidden');
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset selectedIndex when portal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Ensure selectedIndex stays within bounds when filteredItems change
  useEffect(() => {
    if (filteredItems.length > 0 && selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    } else if (filteredItems.length === 0) {
      setSelectedIndex(0);
    }
  }, [filteredItems.length, selectedIndex]);

  useEffect(() => {
    if (isOpen && animationPhase === 'hidden') {
      setAnimationPhase('opening');
      setTimeout(() => setAnimationPhase('open'), SEARCH_CONSTANTS.ANIMATION_OPENING_DURATION);
    } else if (!isOpen && animationPhase !== 'hidden') {
      setAnimationPhase('closing');
      setTimeout(() => setAnimationPhase('hidden'), SEARCH_CONSTANTS.ANIMATION_CLOSING_DURATION);
    }
  }, [isOpen, animationPhase]);

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
          ...searchFields.reduce((acc, field) => ({ ...acc, [field.key]: field.value }), {}),
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
      // Only reset selectedIndex if current selection would be out of bounds
      setSelectedIndex(prev => prev >= filtered.length ? 0 : prev);
    } else {
      setFilteredItems(items);
      // Only reset selectedIndex if current selection would be out of bounds
      setSelectedIndex(prev => prev >= items.length ? 0 : prev);
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
          if (selectedIndex >= 0 && selectedIndex < filteredItems.length && filteredItems[selectedIndex]) {
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
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (animationPhase === 'hidden') return null;

  return (
    <div
      ref={modalRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-80 flex flex-col"
      style={{
        top: position.top + 5,
        left: position.left,
        maxHeight: config.maxHeight,
      }}
    >
      <div
        className={`flex-shrink-0 bg-white border-b border-gray-100 px-3 py-2 rounded-t-lg transition-all duration-300 ease-out ${
          animationPhase === 'open'
            ? 'opacity-100 transform translate-y-0'
            : 'opacity-0 transform -translate-y-2' 
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <HiOutlineSparkles className="w-3 h-3" />
          <span>{config.headerText}</span>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto min-h-0 transition-all duration-300 ease-out ${
          animationPhase === 'open'
            ? 'opacity-100 transform translate-y-0 scale-100'
            : animationPhase === 'opening'
            ? 'opacity-0 max-h-0 transform translate-y-4 scale-95'
            : 'opacity-0 max-h-0 transform -translate-y-2 scale-98'
        }`}
      >
        {filteredItems.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            {config.noResultsText.replace('{searchTerm}', searchTerm)}
          </div>
        ) : (
          <div className="py-1">
            {filteredItems.map((item, index) => (
              <div
                key={config.getItemKey(item)}
                ref={el => {
                  itemRefs.current[index] = el;
                }}
                className={`px-3 py-2 cursor-pointer flex items-start gap-3 mx-1 rounded-md transition-all duration-200 ease-out ${
                  index === selectedIndex
                    ? config.theme === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                    : 'bg-transparent hover:bg-gray-50'
                }`}
                onClick={() => onSelect(item)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {config.getItemIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        index === selectedIndex
                          ? config.theme === 'blue' ? 'text-blue-700' : 'text-purple-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {config.getItemLabel(item)}
                    </span>
                    {config.getItemSecondaryText && (
                      <span className="text-xs text-gray-400 font-mono">
                        {config.getItemSecondaryText(item)}
                      </span>
                    )}
                  </div>
                  {config.getItemDescription && config.getItemDescription(item) && (
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

      <div
        className={`flex-shrink-0 bg-gray-50 border-t border-gray-100 px-3 py-2 rounded-b-lg transition-all duration-300 ease-out ${
          animationPhase === 'open'
            ? 'opacity-100 transform translate-y-0'
            : 'opacity-0 transform translate-y-2'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ navigasi • Enter pilih • Esc tutup</span>
          <span>{filteredItems.length} {config.footerSingular}</span>
        </div>
      </div>
    </div>
  );
}

export default BaseSelector;