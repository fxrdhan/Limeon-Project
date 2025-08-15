import { memo, useMemo, useState } from 'react';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { TbTablePlus, TbTableOptions, TbFolder, TbFolderOff } from 'react-icons/tb';
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
  // Grid modal props - for items tab
  isRowGroupingEnabled?: boolean;
  onRowGroupingToggle?: () => void;
  showGridModal?: boolean;
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
  isRowGroupingEnabled,
  onRowGroupingToggle,
  showGridModal = false,
}: SearchToolbarProps<T>) {
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

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
            {showGridModal ? (
              /* Grid Modal for Items Tab */
              <>
                <span
                  className="inline-block cursor-pointer mt-1.5"
                  onClick={() => setIsGridModalOpen(!isGridModalOpen)}
                  title="Grid Settings"
                >
                  <TbTableOptions className="h-8 w-8 text-primary hover:text-primary/80 transition-colors duration-200" />
                </span>

                {/* Grid Modal */}
                {isGridModalOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsGridModalOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[150px]">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Grid Settings</h3>
                          <button
                            onClick={() => setIsGridModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Row Grouping Control */}
                        {onRowGroupingToggle && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Row Grouping
                            </label>
                            <button
                              onClick={onRowGroupingToggle}
                              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                isRowGroupingEnabled
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isRowGroupingEnabled ? (
                                <TbFolder className="h-4 w-4" />
                              ) : (
                                <TbFolderOff className="h-4 w-4" />
                              )}
                              {isRowGroupingEnabled ? 'Grouping ON' : 'Grouping OFF'}
                            </button>
                          </div>
                        )}

                        {/* Column Visibility Control */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            Column Visibility
                          </label>
                          <div className="relative">
                            <style>{`
                              .grid-modal-dropdown .hs-dropdown button {
                                background: rgb(249 250 251) !important;
                                border: 1px solid rgb(209 213 219) !important;
                                padding: 8px 12px !important;
                                min-height: 36px !important;
                                height: 36px !important;
                                width: 100% !important;
                                border-radius: 6px !important;
                                box-shadow: none !important;
                                cursor: pointer !important;
                                text-align: left !important;
                                color: rgb(55 65 81) !important;
                                font-size: 14px !important;
                              }
                              .grid-modal-dropdown .hs-dropdown button:hover {
                                background: rgb(243 244 246) !important;
                              }
                              .grid-modal-dropdown .hs-dropdown button:focus {
                                outline: none !important;
                                box-shadow: 0 0 0 2px rgb(59 130 246 / 0.1) !important;
                                border-color: rgb(59 130 246) !important;
                              }
                              .grid-modal-dropdown .hs-dropdown button > * {
                                display: flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                                width: 100% !important;
                              }
                            `}</style>

                            <div className="grid-modal-dropdown">
                              <Dropdown
                                options={dropdownOptions}
                                value={visibleColumnIds}
                                onChange={handleColumnSelectionChange}
                                placeholder="Select columns to show"
                                name="grid-modal-column-visibility"
                                withCheckbox={true}
                                searchList={true}
                                mode="input"
                                portalWidth="content"
                                position="bottom"
                              />
                            </div>

                            {/* Custom icon overlay */}
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <TbTableOptions className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Original Dropdown for Entity Tabs */
              <>
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
              </>
            )}
          </div>
        )}
        <div className="inline-block ml-2 mb-1 mt-0.5">
          <ExportDropdown gridApi={gridApi || null} filename={exportFilename} />
        </div>
      </div>
    </>
  );
});

export default SearchToolbar;
