import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { COMBOBOX_CONSTANTS, SEARCH_STATES, SearchState } from '../constants';
import { filterAndSortOptions } from '../utils/comboboxUtils';
import { createComboboxChangeDetails } from '../utils/eventDetails';
import type {
  ComboboxInputValueChangeDetails,
  ComboboxInputValueChangeReason,
  ComboboxOption,
} from '@/types';

export const useComboboxSearch = (
  options: ComboboxOption[],
  searchList: boolean,
  inputValue?: string,
  onInputValueChange?: (
    value: string,
    details: ComboboxInputValueChangeDetails
  ) => void
) => {
  const isControlled = inputValue !== undefined;
  const [uncontrolledSearchTerm, setUncontrolledSearchTerm] = useState('');
  const searchTerm = isControlled ? inputValue : uncontrolledSearchTerm;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<SearchState>(
    SEARCH_STATES.IDLE
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchTerm(searchTerm),
      COMBOBOX_CONSTANTS.DEBOUNCE_DELAY
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      return options;
    } else if (debouncedSearchTerm.trim() !== '') {
      return filterAndSortOptions(options, debouncedSearchTerm);
    } else {
      return options;
    }
  }, [options, debouncedSearchTerm, searchList]);

  // Derive search state from filtered results
  const derivedSearchState = useMemo(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      return SEARCH_STATES.IDLE;
    } else if (debouncedSearchTerm.trim() !== '') {
      return filteredOptions.length > 0
        ? SEARCH_STATES.FOUND
        : SEARCH_STATES.NOT_FOUND;
    } else {
      return SEARCH_STATES.IDLE;
    }
  }, [debouncedSearchTerm, searchList, filteredOptions.length]);

  // Sync derived state to actual state
  useEffect(() => {
    setSearchState(derivedSearchState);
  }, [derivedSearchState]);

  const updateSearchTerm = useCallback(
    (
      newValue: string,
      reason: ComboboxInputValueChangeReason = 'input-change',
      event?: Event | SyntheticEvent<any>
    ) => {
      const details = createComboboxChangeDetails(reason, event);
      onInputValueChange?.(newValue, details);

      if (details.isCanceled) {
        return false;
      }

      if (!isControlled) {
        setUncontrolledSearchTerm(newValue);
      }
      setSearchState(
        newValue.trim() === ''
          ? SEARCH_STATES.IDLE
          : searchState === SEARCH_STATES.IDLE
            ? SEARCH_STATES.TYPING
            : searchState
      );

      return true;
    },
    [isControlled, onInputValueChange, searchState]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSearchTerm(e.target.value, 'input-change', e);
    },
    [updateSearchTerm]
  );

  const resetSearch = useCallback(
    (event?: Event | SyntheticEvent<any>) => {
      const details = createComboboxChangeDetails('reset' as const, event);
      onInputValueChange?.('', details);

      if (details.isCanceled) {
        return false;
      }

      if (!isControlled) {
        setUncontrolledSearchTerm('');
      }
      setSearchState(SEARCH_STATES.IDLE);
      return true;
    },
    [isControlled, onInputValueChange]
  );

  const updateSearchState = useCallback((state: SearchState) => {
    setSearchState(state);
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    searchState,
    filteredOptions,
    handleSearchChange,
    updateSearchTerm,
    resetSearch,
    updateSearchState,
  };
};
