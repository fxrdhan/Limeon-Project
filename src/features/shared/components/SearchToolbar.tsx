import { memo } from 'react';
import Button from '@/components/button';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { ColumnVisibilityDropdown } from '@/components/column-visibility';
import { FaPlus } from 'react-icons/fa';
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
  buttonText: string;
  placeholder?: string;
  onAdd: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Optional props for items tab specific behavior
  items?: T[];
  onItemSelect?: (item: T) => void;
  // Column visibility props
  columnOptions?: Array<{
    key: string;
    label: string;
    visible: boolean;
  }>;
  onColumnToggle?: (columnKey: string, visible: boolean) => void;
}

const SearchToolbar = memo(function SearchToolbar<T extends { id: string }>({
  searchInputRef,
  searchBarProps,
  search,
  buttonText,
  placeholder,
  onAdd,
  onKeyDown,
  items,
  onItemSelect,
  columnOptions,
  onColumnToggle,
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
    <div className="flex items-center">
      <EnhancedSearchBar
        inputRef={searchInputRef}
        {...searchBarProps}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || searchBarProps.placeholder || 'Cari...'}
        className="grow"
      />
      <Button
        variant="primary"
        withGlow
        className="flex items-center ml-4 mb-2"
        onClick={onAdd}
      >
        <FaPlus className="mr-2" />
        {buttonText}
      </Button>
      {columnOptions && onColumnToggle && (
        <ColumnVisibilityDropdown
          columns={columnOptions}
          onColumnToggle={onColumnToggle}
        />
      )}
    </div>
  );
});

export default SearchToolbar;
