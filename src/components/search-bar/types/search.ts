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

export interface FilterCondition {
  operator: string;
  value: string;
  valueTo?: string; // For inRange operator (Between) - second value
  // Multi-column support: each condition can have its own column
  field?: string; // Column field name for this condition
  column?: SearchColumn; // Column reference for this condition
}

export interface FilterSearch {
  field: string;
  value: string; // For single condition (backward compat)
  valueTo?: string; // For inRange (Between) operator - second value
  column: SearchColumn;
  operator: string; // For single condition (backward compat)
  isExplicitOperator: boolean;
  // Multi-condition support
  conditions?: FilterCondition[]; // Array of conditions for AND/OR
  joinOperator?: 'AND' | 'OR'; // Join operator between conditions
  isMultiCondition?: boolean; // Flag to indicate multi-condition filter
  isMultiColumn?: boolean; // Flag to indicate multi-column filter (conditions on different columns)
  // Confirmed state (user pressed Enter to lock filter value as badge)
  isConfirmed?: boolean; // Flag to show value as gray badge instead of in input
  // Between operator waiting state (first value entered, waiting for second)
  waitingForValueTo?: boolean;
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
  showJoinOperatorSelector: boolean; // NEW: for #and/#or selection
  isFilterMode: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  globalSearch?: string;
  isSecondOperator?: boolean; // NEW: flag for second+ operator selection
  partialJoin?: 'AND' | 'OR'; // NEW: selected join operator before next condition
  secondOperator?: string; // NEW: second operator selected (for displaying blue badge)
  secondValue?: string; // NEW: second condition value being typed
  secondValueTo?: string; // NEW: second condition valueTo (for Between operator)
  waitingForSecondValueTo?: boolean; // NEW: flag when second Between has value, waiting for valueTo
  // Multi-column support
  isSecondColumn?: boolean; // Flag: selecting second column after join operator
  secondColumn?: SearchColumn; // The second column selected (for multi-column filtering)
}
