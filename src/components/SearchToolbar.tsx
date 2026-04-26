import { ExportDropdown } from '@/components/export';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import type { FilterSearch, SearchColumn } from '@/types/search';
import type { GridApi } from 'ag-grid-community';
import { memo } from 'react';
import { TbTablePlus } from 'react-icons/tb';

interface SearchToolbarProps<T = unknown> {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchScopeKey?: string;
  searchBarProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGlobalSearch: (searchValue: string) => void;
    onClearSearch: () => void;
    onFilterSearch: (filterSearch: FilterSearch | null) => void;
    searchState: 'idle' | 'typing' | 'found' | 'not-found';
    columns: SearchColumn[];
    placeholder?: string;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  };
  search?: string;
  placeholder?: string;
  onAdd: () => void;
  addTooltipLabel?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Optional props for items tab specific behavior
  items?: T[];
  onItemSelect?: (item: T) => void;
  // Export props
  gridApi?: GridApi | null;
  exportFilename?: string;
  exportTooltipLabel?: string;
  // Tab navigation callback
  onTabNext?: () => void;
  onTabPrevious?: () => void;
}

const SearchToolbar = memo(function SearchToolbar<T extends { id: string }>({
  searchInputRef,
  searchScopeKey,
  searchBarProps,
  search,
  placeholder,
  onAdd,
  addTooltipLabel = 'Tambah Data Baru',
  onKeyDown,
  items,
  onItemSelect,
  gridApi,
  exportFilename = 'data-export',
  exportTooltipLabel = 'Export Data',
  onTabNext,
  onTabPrevious,
}: SearchToolbarProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab key for direct tab navigation
    if (e.key === 'Tab') {
      // Ignore keyboard auto-repeat to prevent rapid navigation spam
      if (e.repeat) {
        e.preventDefault();
        return;
      }

      // Stop event propagation immediately to prevent focus from moving to grid
      e.preventDefault();
      e.stopPropagation();

      // Use setTimeout to ensure navigation happens after event is fully handled
      setTimeout(() => {
        if (e.shiftKey) {
          // Shift+Tab: Previous tab
          onTabPrevious?.();
        } else {
          // Tab: Next tab
          onTabNext?.();
        }
      }, 0);

      return;
    }

    // Use custom onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }

    // Don't intercept Enter if in targeted search mode (contains # for column/operator selection)
    const isTargetedSearch = searchBarProps.value.includes('#');

    // Default behavior for items tab - only if NOT in targeted search mode
    if (e.key === 'Enter' && items && onItemSelect && !isTargetedSearch) {
      e.preventDefault();

      if (items.length > 0) {
        const firstItem = items[0];
        onItemSelect(firstItem);
      } else if (search && search.trim() !== '') {
        onAdd();
      }
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <EnhancedSearchBar
          stateScopeKey={searchScopeKey}
          inputRef={searchInputRef}
          {...searchBarProps}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || searchBarProps.placeholder || 'Cari...'}
          className="grow"
        />
        <Tooltip side="bottom">
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-block ml-4 mb-2"
              onClick={onAdd}
              aria-label="Tambah Item Baru"
            >
              <TbTablePlus className="h-8 w-8 text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{addTooltipLabel}</TooltipContent>
        </Tooltip>

        <div className="inline-block ml-2 mb-1 mt-0.5">
          <ExportDropdown
            gridApi={gridApi || null}
            filename={exportFilename}
            tooltipLabel={exportTooltipLabel}
          />
        </div>
      </div>
    </TooltipProvider>
  );
});

export default SearchToolbar;
