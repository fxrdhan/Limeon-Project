import type { KeyboardEvent, Ref } from 'react';
import { TbSearch } from 'react-icons/tb';
import { cn } from '@/lib/utils';
import { Combobox } from '../internal/primitive';
import type { PharmaComboboxClassNames } from '../presets-types';

export interface ComboboxSearchHeaderProps {
  classNames?: PharmaComboboxClassNames;
  controlName: string;
  isSearchNavigationFocus: boolean;
  normalizedInputValue: string;
  onNavigationFocusChange: (isFocused: boolean) => void;
  onSearchInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchInputRef: Ref<HTMLInputElement>;
  searchPlaceholder: string;
}

export function ComboboxSearchHeader({
  classNames,
  controlName,
  isSearchNavigationFocus,
  normalizedInputValue,
  onNavigationFocusChange,
  onSearchInputKeyDown,
  searchInputRef,
  searchPlaceholder,
}: ComboboxSearchHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white p-2',
        classNames?.searchHeader
      )}
    >
      <div className="relative flex items-center">
        <TbSearch
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3 h-4 w-4',
            normalizedInputValue ? 'text-primary' : 'text-slate-400',
            classNames?.searchIcon
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
              : 'focus:border-primary focus:ring-2 focus:ring-primary/15',
            classNames?.searchInput,
            isSearchNavigationFocus && classNames?.searchInputNavigationFocus
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
