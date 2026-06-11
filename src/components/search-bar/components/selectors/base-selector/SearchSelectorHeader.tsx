import { TbSearch } from 'react-icons/tb';
import type { ComboboxSearchHeaderProps } from '@/components/combobox/components/combobox-search-header';
import { cn } from '@/lib/utils';
import { SearchSelectorCombobox } from './searchSelectorCombobox';

export function SearchSelectorHeader({
  controlName,
  isSearchNavigationFocus,
  normalizedInputValue,
  onNavigationFocusChange,
  onSearchInputKeyDown,
  searchInputRef,
  searchPlaceholder,
}: ComboboxSearchHeaderProps) {
  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-[220px] items-center gap-2">
        <TbSearch
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0',
            normalizedInputValue ? 'text-primary' : 'text-slate-400'
          )}
        />
        <SearchSelectorCombobox.Input
          ref={searchInputRef}
          role="searchbox"
          data-pharma-combobox-navigation-focus={
            isSearchNavigationFocus ? '' : undefined
          }
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 outline-hidden placeholder:text-slate-400 focus:ring-0',
            isSearchNavigationFocus ? 'ring-0' : 'focus:text-slate-900'
          )}
          aria-label={`Cari ${controlName}`}
          aria-required={false}
          placeholder={searchPlaceholder}
          tabIndex={0}
          onKeyDown={onSearchInputKeyDown}
          onPointerDown={() => {
            onNavigationFocusChange(false);
          }}
          onBlur={() => {
            onNavigationFocusChange(false);
          }}
        />
      </div>
    </div>
  );
}
