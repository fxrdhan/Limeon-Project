import type { KeyboardEvent, Ref } from 'react';
import { TbSearch } from 'react-icons/tb';
import { cn } from '@/lib/utils';
import { Combobox } from '../primitive';

interface ComboboxSearchHeaderProps {
  controlName: string;
  isSearchNavigationFocus: boolean;
  normalizedInputValue: string;
  onNavigationFocusChange: (isFocused: boolean) => void;
  onSearchInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchInputRef: Ref<HTMLInputElement>;
  searchPlaceholder: string;
}

export function ComboboxSearchHeader({
  controlName,
  isSearchNavigationFocus,
  normalizedInputValue,
  onNavigationFocusChange,
  onSearchInputKeyDown,
  searchInputRef,
  searchPlaceholder,
}: ComboboxSearchHeaderProps) {
  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white p-2">
      <div className="relative flex items-center">
        <TbSearch
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3 h-4 w-4',
            normalizedInputValue ? 'text-primary' : 'text-slate-400'
          )}
        />
        <Combobox.Input
          ref={searchInputRef}
          role="searchbox"
          data-pharma-combobox-navigation-focus={
            isSearchNavigationFocus ? '' : undefined
          }
          className={cn(
            'w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-hidden transition placeholder:text-slate-400',
            isSearchNavigationFocus
              ? 'focus:border-slate-200 focus:ring-0'
              : 'focus:border-primary focus:ring-2 focus:ring-primary/15'
          )}
          aria-label={`Cari ${controlName}`}
          aria-required={false}
          placeholder={searchPlaceholder}
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
