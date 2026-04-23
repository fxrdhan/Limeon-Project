import type { SearchState } from "@/components/search-bar/constants";
import SearchBar from "@/components/search-bar/SearchBar";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { TbChevronDown, TbChevronUp, TbLayoutSidebarRightCollapse, TbX } from "react-icons/tb";

interface SearchHeaderContentProps {
  searchQuery: string;
  searchState: SearchState;
  searchResultPositionLabel: string;
  searchResultCount: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchQueryChange: (value: string) => void;
  onNavigateSearchUp: () => void;
  onNavigateSearchDown: () => void;
  onFocusSearchInput: () => void;
  onExitSearchMode: () => void;
  onClose: () => void;
}

const floatingBlockClass = "rounded-full border border-slate-200/95 bg-white/95";
const floatingIconButtonClass = `${floatingBlockClass} inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-black transition-colors hover:bg-slate-50 hover:text-black disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`;
const floatingSplitIconButtonClass =
  "inline-flex h-1/2 w-full cursor-pointer items-center justify-center text-black transition-colors hover:bg-slate-50 hover:text-black disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white";

const SearchHeaderContent = ({
  searchQuery,
  searchState,
  searchResultPositionLabel,
  searchResultCount,
  canNavigateSearchUp,
  canNavigateSearchDown,
  searchInputRef,
  onSearchQueryChange,
  onNavigateSearchUp,
  onNavigateSearchDown,
  onFocusSearchInput,
  onExitSearchMode,
  onClose,
}: SearchHeaderContentProps) => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(event.target.value);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onNavigateSearchUp();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onNavigateSearchDown();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        onNavigateSearchUp();
      } else {
        onNavigateSearchDown();
      }
    }
  };

  const searchResultLabel = searchState === "error" ? "Gagal" : searchResultPositionLabel;

  return (
    <div className="flex w-full items-center gap-2.5">
      <SearchBar
        value={searchQuery}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        onFocus={onFocusSearchInput}
        placeholder="Cari pesan..."
        className="!mb-0 min-w-0 flex-1"
        inputRef={searchInputRef}
        searchState={searchState}
        showNotFoundArrow={false}
      />
      <div className="flex items-center gap-2">
        <div
          className={`overflow-hidden transition-[width,opacity,margin] duration-200 ease-out ${
            searchResultCount > 0
              ? "w-9 opacity-100 mr-0"
              : "w-0 opacity-0 -mr-1 pointer-events-none"
          }`}
          aria-hidden={searchResultCount === 0}
        >
          <div
            className={`${floatingBlockClass} inline-flex h-9 w-9 shrink-0 flex-col overflow-hidden divide-y divide-slate-200/95`}
          >
            <button
              type="button"
              aria-label="Hasil sebelumnya"
              title="Hasil sebelumnya"
              className={floatingSplitIconButtonClass}
              onClick={onNavigateSearchUp}
              disabled={searchResultCount === 0 || !canNavigateSearchUp}
            >
              <TbChevronUp size={16} />
            </button>
            <button
              type="button"
              aria-label="Hasil berikutnya"
              title="Hasil berikutnya"
              className={floatingSplitIconButtonClass}
              onClick={onNavigateSearchDown}
              disabled={searchResultCount === 0 || !canNavigateSearchDown}
            >
              <TbChevronDown size={16} />
            </button>
          </div>
        </div>
        <span
          className={`${floatingBlockClass} inline-flex h-9 min-w-11 items-center justify-center px-2.5 text-center text-xs font-medium text-slate-500`}
          aria-live="polite"
        >
          {searchResultLabel}
        </span>
        <button
          type="button"
          aria-label="Tutup pencarian"
          title="Tutup pencarian"
          className={floatingIconButtonClass}
          onClick={onExitSearchMode}
        >
          <TbX size={20} />
        </button>
        <button
          onClick={onClose}
          aria-label="Tutup sidebar chat"
          title="Tutup sidebar chat"
          className={floatingIconButtonClass}
        >
          <TbLayoutSidebarRightCollapse size={20} />
        </button>
      </div>
    </div>
  );
};

export default SearchHeaderContent;
