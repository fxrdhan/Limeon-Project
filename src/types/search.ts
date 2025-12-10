export interface SearchColumn {
  field: string;
  headerName: string;
  searchable: boolean;
  type?: 'text' | 'number' | 'date' | 'currency';
  description?: string;
  isMultiFilter?: boolean; // Indicates if column uses AG Grid multi-filter
}

export interface TargetedSearch {
  field: string;
  value: string;
  column: SearchColumn;
  operator?: string;
}

export interface FilterCondition {
  operator: string;
  value: string;
  valueTo?: string; // For inRange operator (Between) - second value
  // Multi-column support: each condition can have its own column
  field?: string; // Column field name for this condition
  column?: SearchColumn; // Column reference for this condition
}

export interface FilterSearch extends TargetedSearch {
  operator: string;
  valueTo?: string; // For inRange (Between) operator - second value
  isExplicitOperator?: boolean; // True if operator was explicitly selected via space pattern
  isConfirmed?: boolean; // True if value was confirmed with ## (Enter key)
  // Multi-condition support
  conditions?: FilterCondition[]; // Array of conditions for AND/OR
  joinOperator?: 'AND' | 'OR'; // Join operator between conditions
  isMultiCondition?: boolean; // Flag to indicate multi-condition filter
  isMultiColumn?: boolean; // Flag to indicate multi-column filter (conditions on different columns)
}

export interface EnhancedSearchState {
  globalSearch?: string;
  showColumnSelector: boolean;
  showOperatorSelector: boolean;
  showJoinOperatorSelector?: boolean; // True when join operator selector (AND/OR) is open
  isFilterMode: boolean;
  filterSearch?: FilterSearch;
  selectedColumn?: SearchColumn;
  isSecondOperator?: boolean; // True when selecting second operator in multi-condition
  partialJoin?: 'AND' | 'OR'; // Join operator selected, building second condition
  secondOperator?: string; // Second operator value for multi-condition
}

export interface ColumnSelectorProps {
  columns: SearchColumn[];
  isOpen: boolean;
  onSelect: (column: SearchColumn) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}

export interface EnhancedSearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  searchState?: 'idle' | 'typing' | 'found' | 'not-found';
  resultsCount?: number;
  columns: SearchColumn[];
  onGlobalSearch?: (search: string) => void;
  onClearSearch?: () => void;
  onFilterSearch?: (filterSearch: FilterSearch | null) => void;
}
