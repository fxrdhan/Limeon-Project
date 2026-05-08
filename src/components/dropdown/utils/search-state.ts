import {
  SEARCH_STATES,
  type SearchState,
} from '@/components/dropdown/constants';
import type { DropdownOption } from '@/types';

export const getSearchState = (
  searchTerm: string,
  debouncedSearchTerm: string,
  filteredOptions: DropdownOption[]
): SearchState => {
  if (!searchTerm.trim()) return SEARCH_STATES.IDLE;
  if (searchTerm !== debouncedSearchTerm) return SEARCH_STATES.TYPING;
  if (filteredOptions.length === 0) return SEARCH_STATES.NOT_FOUND;
  return SEARCH_STATES.FOUND;
};
