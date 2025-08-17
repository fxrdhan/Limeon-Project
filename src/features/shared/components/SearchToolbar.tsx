import { memo } from 'react';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { TbTablePlus, TbDeviceFloppy, TbDownload } from 'react-icons/tb';
import { ExportDropdown } from '@/components/export';
import { GridApi } from 'ag-grid-community';
import type { SearchColumn, FilterSearch } from '@/types/search';
import {
  saveGridState,
  downloadGridState,
  hasSavedState,
  type TableType,
} from '@/features/shared/utils/gridStateManager';

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
  // Manual state management props
  currentTableType?: TableType;
  enableManualStateButtons?: boolean;
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
  currentTableType,
  enableManualStateButtons = false,
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

  // Manual state management handlers
  const handleSaveState = () => {
    if (gridApi && currentTableType) {
      saveGridState(gridApi, currentTableType);
    }
  };

  const handleDownloadState = () => {
    if (currentTableType) {
      downloadGridState(currentTableType);
    }
  };

  // Check if saved state exists for current table
  const hasExistingSavedState = currentTableType
    ? hasSavedState(currentTableType)
    : false;

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

        {/* Save & Download State Buttons (Auto-restore handles restoration) */}
        {enableManualStateButtons && gridApi && currentTableType && (
          <>
            <span
              className="inline-block ml-3 mb-2"
              onClick={handleSaveState}
              title={`Simpan Layout Grid ${currentTableType}`}
            >
              <TbDeviceFloppy className="h-7 w-7 text-blue-600 cursor-pointer hover:text-blue-500 transition-colors duration-200" />
            </span>
            <span
              className={`inline-block ml-2 mb-2 ${
                hasExistingSavedState
                  ? 'text-purple-600 hover:text-purple-500 cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              onClick={hasExistingSavedState ? handleDownloadState : undefined}
              title={
                hasExistingSavedState
                  ? `Download Layout Grid ${currentTableType} sebagai JSON`
                  : `Tidak ada layout tersimpan untuk ${currentTableType}`
              }
            >
              <TbDownload className="h-7 w-7 transition-colors duration-200" />
            </span>
          </>
        )}

        <div className="inline-block ml-2 mb-1 mt-0.5">
          <ExportDropdown gridApi={gridApi || null} filename={exportFilename} />
        </div>
      </div>
    </>
  );
});

export default SearchToolbar;
