import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TbSearch } from 'react-icons/tb';
import fuzzysort from 'fuzzysort';
import { motion } from 'motion/react';
import { createTypedCombobox } from '@/components/combobox';
import { comboboxHighlightBackgroundTransition } from '@/components/combobox/components/combobox-highlight-motion';
import { BaseSelectorProps } from '../../types';
import { SEARCH_CONSTANTS } from '../../constants';

const SearchSelectorCombobox = createTypedCombobox<unknown>();

type SelectorSearchResult<T> = {
  item: T;
  labelIndices: readonly number[] | null;
  score: number;
};

const HighlightedText: React.FC<{
  text: string;
  indices: readonly number[] | null;
  theme?: 'purple' | 'blue' | 'orange';
}> = ({ text, indices }) => {
  if (!indices || indices.length === 0) {
    return <>{text}</>;
  }

  const indexSet = new Set(indices);
  return (
    <>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={indexSet.has(index) ? 'font-bold text-slate-950' : ''}
        >
          {char}
        </span>
      ))}
    </>
  );
};

function BaseSelector<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm: externalSearchTerm = '',
  config,
  defaultSelectedIndex,
  onHighlightChange,
  contentKey,
}: BaseSelectorProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeContentKey = contentKey ?? config.headerText;
  const isSelectorVisible = isOpen && (position.isReady ?? true);
  const [inputValue, setInputValue] = useState(externalSearchTerm);

  useEffect(() => {
    if (!isOpen) return;
    setInputValue(externalSearchTerm);
  }, [activeContentKey, externalSearchTerm, isOpen]);

  useLayoutEffect(() => {
    if (!isSelectorVisible) return;

    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [activeContentKey, isSelectorVisible]);

  useEffect(() => {
    if (!isOpen) {
      onHighlightChange?.(null);
    }
  }, [isOpen, onHighlightChange]);

  const searchFieldsConfig = useMemo(() => {
    if (items.length === 0) return [];
    return config.getSearchFields(items[0]);
  }, [items, config]);

  const searchResults = useMemo<SelectorSearchResult<T>[]>(() => {
    const normalizedSearch = inputValue.trim();
    if (!normalizedSearch || items.length === 0) {
      return items.map(item => ({
        item,
        labelIndices: null,
        score: 0,
      }));
    }

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

    const rankedResults = new Map<string, SelectorSearchResult<T>>();

    searchFieldsConfig.forEach(fieldConfig => {
      const results = fuzzysort.go(normalizedSearch, searchTargets, {
        key: fieldConfig.key,
        threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
      });

      results.forEach(result => {
        const itemKey = config.getItemKey(result.obj.item);
        const score = result.score + (fieldConfig.boost || 0);
        const currentBest = rankedResults.get(itemKey);

        if (!currentBest || score > currentBest.score) {
          rankedResults.set(itemKey, {
            item: result.obj.item,
            labelIndices: null,
            score,
          });
        }
      });
    });

    const labelTargets = Array.from(rankedResults.values()).map(result => ({
      item: result.item,
      label: config.getItemLabel(result.item),
    }));

    const labelResults = fuzzysort.go(normalizedSearch, labelTargets, {
      key: 'label',
      threshold: -Infinity,
    });

    labelResults.forEach(result => {
      const itemKey = config.getItemKey(result.obj.item);
      const existing = rankedResults.get(itemKey);
      if (existing) {
        rankedResults.set(itemKey, {
          ...existing,
          labelIndices: result.indexes,
        });
      }
    });

    return Array.from(rankedResults.values()).sort(
      (first, second) => second.score - first.score
    );
  }, [config, inputValue, items, searchFieldsConfig]);

  const filteredItems = useMemo(
    () => searchResults.map(result => result.item),
    [searchResults]
  );

  const labelIndicesByKey = useMemo(() => {
    const indices = new Map<string, readonly number[] | null>();
    searchResults.forEach(result => {
      indices.set(config.getItemKey(result.item), result.labelIndices);
    });
    return indices;
  }, [config, searchResults]);

  const defaultHighlightedIndex =
    filteredItems.length === 0
      ? null
      : Math.min(defaultSelectedIndex ?? 0, filteredItems.length - 1);

  const modalPosition = {
    x: position.left,
    y: position.top + 5,
  };

  const selectedTextClass = 'text-slate-950';

  const highlightBackgroundClass =
    config.theme === 'blue'
      ? 'bg-blue-100'
      : config.theme === 'orange'
        ? 'bg-orange-100'
        : 'bg-purple-100';
  const trimmedInputValue = inputValue.trim();
  const noResultsMessage = trimmedInputValue
    ? config.noResultsText.replace('{searchTerm}', trimmedInputValue)
    : 'Tidak ditemukan';

  return (
    <>
      {isSelectorVisible && (
        <SearchSelectorCombobox.Root
          key={activeContentKey}
          autoHighlight
          defaultHighlightedIndex={defaultHighlightedIndex}
          filter={null}
          filteredItems={filteredItems as readonly unknown[]}
          inputValue={inputValue}
          items={items as readonly unknown[]}
          itemToStringLabel={item => config.getItemLabel(item as T)}
          itemToStringValue={item => config.getItemKey(item as T)}
          open={isOpen}
          onInputValueChange={setInputValue}
          onItemHighlighted={item => {
            onHighlightChange?.((item as T | undefined) ?? null);
          }}
          onOpenChange={(open, details) => {
            if (!open && details.reason !== 'item-press') {
              onClose();
            }
          }}
          onValueChange={item => {
            if (item !== null) {
              onSelect(item as T);
            }
          }}
        >
          <SearchSelectorCombobox.Popup
            initialFocus={false}
            className="fixed z-50 w-max min-w-[220px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            style={{
              left: modalPosition.x,
              top: modalPosition.y,
            }}
          >
            <div className="sticky top-0 z-20 shrink-0 border-b border-slate-100 bg-white px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <TbSearch
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400"
                />
                <SearchSelectorCombobox.Input
                  ref={inputRef}
                  role="searchbox"
                  className="min-w-[90px] flex-1 border-none bg-transparent p-0 text-[13px] leading-5 text-slate-950 outline-hidden transition placeholder:text-slate-400 focus:text-slate-950 focus:ring-0"
                  aria-label={config.headerText}
                  placeholder="Cari..."
                  tabIndex={0}
                  onKeyDown={event => {
                    event.stopPropagation();
                  }}
                />
              </div>
            </div>

            <SearchSelectorCombobox.List
              className="overflow-y-auto overflow-x-hidden py-1"
              style={{ maxHeight: config.maxHeight }}
            >
              {rawItem => {
                const item = rawItem as T;
                const itemKey = config.getItemKey(item);
                const highlightIndices = labelIndicesByKey.get(itemKey) ?? null;

                return (
                  <SearchSelectorCombobox.Item
                    render={(props, state) => {
                      const { ref, ...itemProps } = props;
                      const isSelected = state.highlighted;

                      return (
                        <div
                          {...itemProps}
                          ref={ref as React.Ref<HTMLDivElement>}
                          className="relative mx-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors duration-150"
                        >
                          {state.highlighted && (
                            <motion.div
                              key={`search-selector-highlight-${activeContentKey}-${inputValue}`}
                              layoutId={`search-selector-highlight-${activeContentKey}-${inputValue}`}
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-0 z-0 rounded-lg ${highlightBackgroundClass}`}
                              initial={false}
                              transition={comboboxHighlightBackgroundTransition}
                            />
                          )}
                          <div
                            className={`relative z-10 shrink-0 transition-colors duration-150 ${
                              isSelected
                                ? config.getItemActiveColor?.(item) ||
                                  'text-slate-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {config.getItemIcon(item)}
                          </div>
                          <div className="relative z-10 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`whitespace-nowrap font-medium transition-colors duration-150 ${
                                  isSelected
                                    ? selectedTextClass
                                    : 'text-slate-700'
                                }`}
                              >
                                <HighlightedText
                                  text={config.getItemLabel(item)}
                                  indices={highlightIndices}
                                  theme={config.theme}
                                />
                              </span>
                              {config.getItemSecondaryText && (
                                <span className="text-xs text-slate-400">
                                  {config.getItemSecondaryText(item)}
                                </span>
                              )}
                            </div>
                            {config.getItemDescription?.(item) && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {config.getItemDescription(item)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                );
              }}
            </SearchSelectorCombobox.List>

            <SearchSelectorCombobox.Empty className="px-3 py-4 text-center text-sm text-slate-500">
              {noResultsMessage}
            </SearchSelectorCombobox.Empty>
          </SearchSelectorCombobox.Popup>
        </SearchSelectorCombobox.Root>
      )}
    </>
  );
}

export default BaseSelector;
