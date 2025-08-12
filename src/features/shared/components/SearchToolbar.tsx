import { memo, useMemo } from 'react';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { TbTablePlus, TbTableOptions } from 'react-icons/tb';
import Dropdown from '@/components/dropdown';
import { ExportDropdown } from '@/components/export';
import { GridApi } from 'ag-grid-community';
import type { SearchColumn, FilterSearch } from '@/types/search';

interface ColumnOption {
  key: string;
  label: string;
  visible: boolean;
}

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
  // Column visibility props
  columnOptions?: ColumnOption[];
  onColumnToggle?: (columnKey: string, visible: boolean) => void;
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
  columnOptions,
  onColumnToggle,
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

  // Transform column options to dropdown format
  const dropdownOptions = useMemo(() => {
    return (columnOptions || []).map(col => ({
      id: col.key,
      name: col.label,
    }));
  }, [columnOptions]);

  // Get visible column IDs for dropdown value
  const visibleColumnIds = useMemo(() => {
    return (columnOptions || []).filter(col => col.visible).map(col => col.key);
  }, [columnOptions]);

  // Handle multiple column selection
  const handleColumnSelectionChange = (selectedIds: string[]) => {
    if (onColumnToggle && columnOptions) {
      // Update visibility for all columns
      columnOptions.forEach(col => {
        const shouldBeVisible = selectedIds.includes(col.key);
        if (col.visible !== shouldBeVisible) {
          onColumnToggle(col.key, shouldBeVisible);
        }
      });
    }
  };

  // Filter search columns based on column visibility
  const filteredSearchBarProps = useMemo(() => {
    if (!columnOptions) {
      return searchBarProps;
    }

    // Create a map of visible column keys for fast lookup
    const visibleColumnKeys = new Set(
      columnOptions.filter(col => col.visible).map(col => col.key)
    );

    // Filter search columns to only include visible ones
    const filteredColumns = searchBarProps.columns.filter(searchCol => {
      // Map search column fields to column keys
      const columnKey = searchCol.field;
      return visibleColumnKeys.has(columnKey);
    });

    return {
      ...searchBarProps,
      columns: filteredColumns,
    };
  }, [searchBarProps, columnOptions]);

  return (
    <>
      <div className="flex items-center">
        <EnhancedSearchBar
          inputRef={searchInputRef}
          {...filteredSearchBarProps}
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
        {columnOptions && onColumnToggle && (
          <div className="inline-block ml-4 mb-2 mr-2 relative">
            {/* Custom dropdown wrapper with icon overlay */}
            <div
              className="column-dropdown-wrapper relative"
              title="Tampilkan/Sembunyikan Kolom"
            >
              <style>{`
                .column-dropdown-wrapper .hs-dropdown button {
                  background: transparent !important;
                  border: none !important;
                  padding: 0 !important;
                  min-height: 32px !important;
                  height: 32px !important;
                  width: 32px !important;
                  box-shadow: none !important;
                  cursor: pointer !important;
                }
                .column-dropdown-wrapper .hs-dropdown button:focus {
                  outline: none !important;
                  box-shadow: none !important;
                }
                .column-dropdown-wrapper .hs-dropdown button > * {
                  display: none !important;
                }
                .column-dropdown-wrapper:hover .column-icon {
                  opacity: 0.8;
                }
              `}</style>

              {/* Dropdown component */}
              <Dropdown
                options={dropdownOptions}
                value={visibleColumnIds}
                onChange={handleColumnSelectionChange}
                placeholder="Tampilkan/Sembunyikan Kolom"
                name="column-visibility"
                withCheckbox={true}
                searchList={true}
                mode="input"
                portalWidth="content"
                position="bottom"
              />

              {/* Icon overlay - positioned over the invisible button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <TbTableOptions className="column-icon h-8 w-8 text-primary transition-opacity duration-200" />
              </div>
            </div>
          </div>
        )}
        <div className="inline-block ml-2 mb-1">
          <ExportDropdown gridApi={gridApi || null} filename={exportFilename} />
        </div>
      </div>
    </>
  );
});

export default SearchToolbar;
