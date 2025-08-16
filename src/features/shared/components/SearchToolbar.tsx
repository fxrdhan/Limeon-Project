import { memo } from 'react';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { TbTablePlus } from 'react-icons/tb';
import { ExportDropdown } from '@/components/export';
import { GridApi } from 'ag-grid-community';
import type { SearchColumn, FilterSearch } from '@/types/search';

interface SearchToolbarProps<T = unknown> {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchBarProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGlobalSearch: (searchValue: string) => void;
    onClearSearch: () => void;
    onFilterSearch: (filterSearch: FilterSearch | null) => void;
    searchState: 'idle' | 'typing' | 'found' | 'not-found';
    columns: SearchColumn[];
    placeholder?: string;
  };
  search?: string;
  placeholder?: string;
  onAdd: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Optional props for items tab specific behavior
  items?: T[];
  onItemSelect?: (item: T) => void;
  // Export props
  gridApi?: GridApi | null;
  exportFilename?: string;
}

const SearchToolbar = memo(function SearchToolbar<T extends { id: string }>({
  searchInputRef,
  searchBarProps,
  search,
  placeholder,
  onAdd,
  onKeyDown,
  items,
  onItemSelect,
  gridApi,
  exportFilename = 'data-export',
}: SearchToolbarProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    <>
      <div className="flex items-center">
        <EnhancedSearchBar
          inputRef={searchInputRef}
          {...searchBarProps}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || searchBarProps.placeholder || 'Cari...'}
          className="grow"
        />
        <span
          className="inline-block ml-4 mb-2"
          onClick={onAdd}
          title="Tambah Item Baru"
        >
          <TbTablePlus className="h-8 w-8 text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200" />
        </span>
        <div className="inline-block ml-2 mb-1 mt-0.5">
          <ExportDropdown gridApi={gridApi || null} filename={exportFilename} />
        </div>
      </div>
    </>
  );
});

export default SearchToolbar;
