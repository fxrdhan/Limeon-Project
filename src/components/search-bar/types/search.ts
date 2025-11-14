import { SearchState } from '../constants';

export interface SearchColumn {
  field: string;
  headerName: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  description?: string;
  searchable: boolean;
  isMultiFilter?: boolean; // Indicates if column uses AG Grid multi-filter
  activeColor?: string;
}

export interface FilterSearch {
  field: string;
  value: string;
  column: SearchColumn;
  operator: string;
  isExplicitOperator: boolean;
}

export interface TableSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  searchState?: SearchState;
}

export interface EnhancedSearchBarProps extends TableSearchProps {
  resultsCount?: number;
  columns: SearchColumn[];
  onGlobalSearch?: (term: string) => void;
  onClearSearch?: () => void;
  onFilterSearch?: (filter: FilterSearch | null) => void;
}

export interface EnhancedSearchState {
  showColumnSelector: boolean;
  showOperatorSelector: boolean;
  isFilterMode: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  globalSearch?: string;
}
