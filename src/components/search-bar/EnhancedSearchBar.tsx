import React, { useRef, useCallback, useMemo } from 'react';
import { LuSearch } from 'react-icons/lu';
import { PiKeyReturnBold } from 'react-icons/pi';
import fuzzysort from 'fuzzysort';
import { EnhancedSearchBarProps, SearchColumn, FilterOperator } from './types';
import { SEARCH_CONSTANTS } from './constants';
import { DEFAULT_FILTER_OPERATORS, NUMBER_FILTER_OPERATORS } from './operators';
import { buildColumnValue, findColumn } from './utils/searchUtils';
import { useSearchState } from './hooks/useSearchState';
import { useSelectorPosition } from './hooks/useSelectorPosition';
import { useSearchInput } from './hooks/useSearchInput';
import { useSearchKeyboard } from './hooks/useSearchKeyboard';
import SearchBadge from './components/SearchBadge';
import SearchIcon from './components/SearchIcon';
import ColumnSelector from './components/selectors/ColumnSelector';
import OperatorSelector from './components/selectors/OperatorSelector';

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = 'Cari...',
  className = '',
  inputRef,
  searchState = 'idle',
  resultsCount,
  columns,
  onGlobalSearch,
  onClearSearch,
  onFilterSearch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const memoizedColumns = useMemo(() => columns, [columns]);

  const { searchMode, setSearchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
  });

  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
  });

  const operatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showOperatorSelector,
    containerRef,
  });

  const {
    displayValue,
    showTargetedIndicator,
    textWidth,
    badgeWidth,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    textMeasureRef,
    badgeRef,
    badgesContainerRef,
  } = useSearchInput({
    value,
    searchMode,
    onChange,
  });

  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      const newValue = buildColumnValue(column.field, 'colon');
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
      setSearchMode(prev => ({ ...prev, showColumnSelector: false }));

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [onChange, inputRef, setSearchMode]
  );

  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const columnMatch = value.match(/^#([^:\s]+)/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        const newValue = `#${columnName} #${operator.value} `;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
      }
    },
    [value, onChange, inputRef, setSearchMode]
  );

  const handleCloseColumnSelector = useCallback(() => {
    setSearchMode(prev => ({ ...prev, showColumnSelector: false }));

    if (value.startsWith('#') && !searchMode.selectedColumn) {
      const searchTerm = value.substring(1);
      const exactMatch = findColumn(memoizedColumns, searchTerm);

      if (!exactMatch) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    }
  }, [
    value,
    searchMode.selectedColumn,
    memoizedColumns,
    onClearSearch,
    onChange,
    setSearchMode,
  ]);

  const handleCloseOperatorSelector = useCallback(() => {
    setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));

    if (searchMode.selectedColumn) {
      const newValue = buildColumnValue(
        searchMode.selectedColumn.field,
        'plain'
      );
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [searchMode.selectedColumn, onChange, onClearSearch, setSearchMode]);

  const handleClearTargeted = useCallback(() => {
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      if (
        searchMode.filterSearch.operator === 'contains' &&
        !searchMode.filterSearch.isExplicitOperator
      ) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        const columnName = searchMode.filterSearch.field;
        const newValue = buildColumnValue(columnName, 'colon');
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
      }
    } else {
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [searchMode, onClearSearch, onChange, inputRef]);

  const { handleInputKeyDown } = useSearchKeyboard({
    value,
    searchMode,
    operatorSearchTerm,
    onChange,
    onKeyDown,
    onClearSearch,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
  });

  const searchTerm = useMemo(() => {
    if (value.startsWith('#')) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : '';
    }
    return '';
  }, [value]);

  const searchableColumns = useMemo(() => {
    return columns.filter(col => col.searchable);
  }, [columns]);

  const sortedColumns = useMemo(() => {
    if (!searchTerm) return searchableColumns;

    const searchTargets = searchableColumns.map(col => ({
      column: col,
      headerName: col.headerName,
      field: col.field,
      description: col.description || '',
    }));

    const headerResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'headerName',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'field',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const descResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'description',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const combinedResults = new Map();

    headerResults.forEach(result => {
      combinedResults.set(result.obj.column.field, {
        column: result.obj.column,
        score: result.score + 1000,
      });
    });

    fieldResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 500,
        });
      }
    });

    descResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score,
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.column);
  }, [searchableColumns, searchTerm]);

  const getPlaceholder = () => {
    if (showTargetedIndicator) {
      return 'Cari...';
    }
    return placeholder;
  };

  // Determine operators based on column type
  const operators = useMemo(() => {
    if (searchMode.selectedColumn?.type === 'number') {
      return [...NUMBER_FILTER_OPERATORS];
    }
    return [...DEFAULT_FILTER_OPERATORS];
  }, [searchMode.selectedColumn?.type]);

  return (
    <>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          <SearchIcon
            searchMode={searchMode}
            searchState={searchState}
            displayValue={displayValue}
            showTargetedIndicator={showTargetedIndicator}
          />

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-[border-color,box-shadow] duration-200 ease-in-out placeholder-gray-400 ${
                searchState === 'not-found'
                  ? 'border-danger focus:border-danger focus:ring-3 focus:ring-red-100'
                  : searchMode.isFilterMode &&
                      searchMode.filterSearch &&
                      searchMode.filterSearch.operator === 'contains' &&
                      !searchMode.filterSearch.isExplicitOperator
                    ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                    : searchMode.isFilterMode && searchMode.filterSearch
                      ? 'border-blue-300 ring-3 ring-blue-100 focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
                      : searchMode.showColumnSelector
                        ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                        : 'border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200'
              } focus:outline-none rounded-lg`}
              style={{
                paddingLeft: showTargetedIndicator
                  ? `${Math.max(badgeWidth + SEARCH_CONSTANTS.BADGE_MARGIN, SEARCH_CONSTANTS.BADGE_WIDTH_FALLBACK)}px`
                  : displayValue
                    ? '12px'
                    : '40px',
                transition: 'padding-left 100ms ease-out',
              }}
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            {showTargetedIndicator && (
              <SearchBadge
                searchMode={searchMode}
                badgeRef={badgeRef}
                badgesContainerRef={badgesContainerRef}
                onClearTargeted={handleClearTargeted}
                onHoverChange={handleHoverChange}
              />
            )}

            <span
              ref={textMeasureRef}
              className="absolute invisible whitespace-nowrap text-sm"
              style={{
                left: showTargetedIndicator
                  ? `${Math.max(badgeWidth + SEARCH_CONSTANTS.BADGE_MARGIN, SEARCH_CONSTANTS.BADGE_WIDTH_FALLBACK)}px`
                  : displayValue
                    ? '18px'
                    : '10px',
                padding: '10px',
              }}
            >
              {displayValue}
            </span>

            <PiKeyReturnBold
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none ml-1 ${
                searchState === 'not-found' && displayValue
                  ? 'opacity-100 scale-150 translate-x-0'
                  : 'opacity-0 scale-95 translate-x-2'
              }`}
              style={{
                left: `${textWidth + (showTargetedIndicator ? Math.max(badgeWidth + SEARCH_CONSTANTS.BADGE_MARGIN, SEARCH_CONSTANTS.BADGE_WIDTH_FALLBACK) : displayValue ? 0 : 10)}px`,
                transition:
                  'left 100ms ease-out, opacity 300ms ease-in-out, transform 300ms ease-in-out',
              }}
            />
          </div>
        </div>

        {resultsCount !== undefined && searchState === 'found' && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <LuSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      <ColumnSelector
        columns={sortedColumns}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelect}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={searchTerm}
      />

      <OperatorSelector
        operators={operators}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelect}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
        searchTerm={operatorSearchTerm}
      />
    </>
  );
};

export default EnhancedSearchBar;
