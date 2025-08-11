import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import { TbPlus } from 'react-icons/tb';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { MdChecklist } from 'react-icons/md';
import Checkbox from '@/components/checkbox';
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
}

const SEARCH_STATES = {
  IDLE: 'idle',
  TYPING: 'typing',
  FOUND: 'found',
  NOT_FOUND: 'not-found',
} as const;

type SearchState = (typeof SEARCH_STATES)[keyof typeof SEARCH_STATES];

const getSearchIconColor = (searchState: SearchState) => {
  const colors: Record<SearchState, string> = {
    idle: 'text-gray-400',
    typing: 'text-gray-800',
    found: 'text-primary',
    'not-found': 'text-primary',
  };
  return colors[searchState] || 'text-gray-400';
};

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
}: SearchToolbarProps<T>) {
  // Column visibility dropdown states
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isColumnDropdownClosing, setIsColumnDropdownClosing] = useState(false);
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [columnSearchState, setColumnSearchState] = useState<SearchState>(
    SEARCH_STATES.IDLE
  );
  const columnButtonRef = useRef<HTMLSpanElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const columnSearchInputRef = useRef<HTMLInputElement>(null);

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

  // Column visibility dropdown handlers
  const handleColumnDropdownToggle = () => {
    if (!isColumnDropdownOpen) {
      setIsColumnDropdownOpen(true);
      setIsColumnDropdownClosing(false);
      setApplyOpenStyles(false);
      // Add small delay for smooth opening animation
      setTimeout(() => {
        setApplyOpenStyles(true);
      }, 10);
    } else {
      setIsColumnDropdownClosing(true);
      setApplyOpenStyles(false);
      setTimeout(() => {
        setIsColumnDropdownOpen(false);
        setIsColumnDropdownClosing(false);
      }, 150); // Match duration-150 from CSS
    }
  };

  const handleColumnToggleInternal = (columnKey: string, checked: boolean) => {
    if (onColumnToggle) {
      onColumnToggle(columnKey, checked);
    }
  };

  const filteredColumnOptions =
    columnOptions?.filter(column =>
      column.label.toLowerCase().includes(columnSearchQuery.toLowerCase())
    ) || [];

  const handleColumnSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColumnSearchQuery(value);

    if (value === '') {
      setColumnSearchState(SEARCH_STATES.IDLE);
    } else {
      setColumnSearchState(SEARCH_STATES.TYPING);
      // Update search state based on results after a brief delay
      setTimeout(() => {
        const filteredResults =
          columnOptions?.filter(column =>
            column.label.toLowerCase().includes(value.toLowerCase())
          ) || [];
        const hasResults = filteredResults.length > 0;
        setColumnSearchState(
          hasResults ? SEARCH_STATES.FOUND : SEARCH_STATES.NOT_FOUND
        );
      }, 100);
    }
  };

  const handleColumnSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
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

  // Close column dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(event.target as Node) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(event.target as Node)
      ) {
        if (isColumnDropdownOpen && !isColumnDropdownClosing) {
          setIsColumnDropdownClosing(true);
          setApplyOpenStyles(false);
          setTimeout(() => {
            setIsColumnDropdownOpen(false);
            setIsColumnDropdownClosing(false);
          }, 150);
        }
      }
    };

    if (isColumnDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnDropdownOpen, isColumnDropdownClosing]);

  // Reset column dropdown states when dropdown closes
  useEffect(() => {
    if (!isColumnDropdownOpen) {
      setApplyOpenStyles(false);
      setColumnSearchQuery('');
      setColumnSearchState(SEARCH_STATES.IDLE);
    }
  }, [isColumnDropdownOpen]);

  // Focus on column search input when dropdown opens
  useEffect(() => {
    if (isColumnDropdownOpen && applyOpenStyles && !isColumnDropdownClosing && columnSearchInputRef.current) {
      setTimeout(() => {
        columnSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isColumnDropdownOpen, applyOpenStyles, isColumnDropdownClosing]);

  // Calculate column dropdown position
  const getColumnDropdownPosition = () => {
    if (!columnButtonRef.current) return { top: 0, left: 0 };

    const buttonRect = columnButtonRef.current.getBoundingClientRect();
    const top = buttonRect.bottom + window.scrollY + 8;
    const left = buttonRect.right + window.scrollX - 232; // Align with button right edge, dropdown to the left

    return { top, left };
  };

  const columnDropdownContent = (
    <>
      {(isColumnDropdownOpen || isColumnDropdownClosing) && (
        <div
          ref={columnDropdownRef}
          className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] overflow-hidden origin-top transition-all duration-150 ease-out ${
            isColumnDropdownClosing || !applyOpenStyles ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={getColumnDropdownPosition()}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Tampilkan/Sembunyikan Kolom
            </h3>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={columnSearchInputRef}
                  type="text"
                  placeholder="Cari kolom..."
                  value={columnSearchQuery}
                  onChange={handleColumnSearchChange}
                  onKeyDown={handleColumnSearchKeyDown}
                  onClick={e => e.stopPropagation()}
                  className={`w-full py-2 text-sm border rounded-lg focus:outline-none transition-all duration-150 ease-out pl-2 ${
                    columnSearchState === SEARCH_STATES.NOT_FOUND
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-red-200'
                      : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-emerald-200'
                  }`}
                />
                {!columnSearchQuery && (
                  <FaMagnifyingGlass
                    className={`absolute top-2.5 right-2 ${getSearchIconColor(columnSearchState)} transition-colors duration-150 ease-out`}
                    size={16}
                  />
                )}
              </div>
              {columnSearchQuery && (
                <FaMagnifyingGlass
                  className={`${getSearchIconColor(columnSearchState)} transition-colors duration-150 ease-out`}
                  size={16}
                  style={{ minWidth: '16px' }}
                />
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filteredColumnOptions.length > 0 ? (
              filteredColumnOptions.map(column => (
                <div
                  key={column.key}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors duration-150 ease-out"
                >
                  <Checkbox
                    id={`column-${column.key}`}
                    label={column.label}
                    checked={column.visible}
                    onChange={checked =>
                      handleColumnToggleInternal(column.key, checked)
                    }
                  />
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Tidak ada kolom yang ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

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
          <TbPlus className="h-8 w-8 text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200" />
        </span>
        {columnOptions && onColumnToggle && (
          <span
            ref={columnButtonRef}
            className="inline-block ml-4 mb-2 mr-2"
            onClick={handleColumnDropdownToggle}
            title="Atur tampilan kolom"
          >
            <MdChecklist className="h-8 w-8 text-primary cursor-pointer hover:text-primary/80 transition-colors duration-200" />
          </span>
        )}
      </div>
      {columnOptions &&
        onColumnToggle &&
        typeof document !== 'undefined' &&
        createPortal(columnDropdownContent, document.body)}
    </>
  );
});

export default SearchToolbar;
