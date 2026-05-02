import React, { forwardRef, RefObject } from 'react';
import { SEARCH_STATES } from '../../constants';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_CLASS,
} from '@/styles/uiPrimitives';

interface SearchInputProps {
  id: string;
  listboxId: string;
  activeDescendantId?: string;
  searchTerm: string;
  searchState: string;
  isOpen: boolean;
  isListEmpty: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      id,
      listboxId,
      activeDescendantId,
      searchTerm,
      searchState,
      isOpen,
      isListEmpty,
      onSearchChange,
      onKeyDown,
      onFocus,
      leaveTimeoutRef,
    },
    ref
  ) => {
    return (
      <input
        id={id}
        ref={ref}
        type="text"
        className={`w-full py-2 text-sm border rounded-lg focus:outline-hidden transition-all duration-300 ease-in-out min-w-0 pl-2 ${
          searchState === SEARCH_STATES.NOT_FOUND
            ? `${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_CLASS}`
            : `${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
        }`}
        placeholder="Cari..."
        value={searchTerm}
        onChange={onSearchChange}
        onKeyDown={onKeyDown}
        onClick={e => e.stopPropagation()}
        onFocus={() => {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          onFocus();
        }}
        data-open={isOpen ? 'true' : 'false'}
        data-popup-open={isOpen ? '' : undefined}
        data-list-empty={isListEmpty ? '' : undefined}
        aria-label="Cari pilihan"
        aria-autocomplete="list"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen ? activeDescendantId : undefined}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
