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
  id?: string; // Unique identifier for stable badge identity
  operator: string;
  value: string;
  valueTo?: string; // For inRange operator (Between) - second value
  // Each condition must have its own column
  field: string; // Column field name for this condition (required)
  column: SearchColumn; // Column reference for this condition (required)
}

/**
 * Maximum number of filter conditions allowed
 * This limit is for UX - too many conditions become confusing
 */
export const MAX_FILTER_CONDITIONS = 5;

export interface FilterSearch {
  field: string;
  value: string; // For single condition (backward compat)
  valueTo?: string; // For inRange (Between) operator - second value
  column: SearchColumn;
  operator: string; // For single condition (backward compat)
  isExplicitOperator: boolean;
  // Multi-condition support (up to MAX_FILTER_CONDITIONS)
  conditions?: FilterCondition[]; // Array of conditions for AND/OR (1 to N)
  joinOperators?: ('AND' | 'OR')[]; // Join operators between conditions (length = conditions.length - 1)
  isMultiCondition?: boolean; // Flag to indicate multi-condition filter (2+ conditions)
  isMultiColumn?: boolean; // Flag to indicate multi-column filter (conditions on different columns)
  // Confirmed state (user pressed Enter to lock filter value as badge)
  isConfirmed?: boolean; // Flag to show value as gray badge instead of in input
  // Between operator waiting state (first value entered, waiting for second)
  waitingForValueTo?: boolean;
  // Deprecated: kept for backward compatibility, use joinOperators[0] instead
  joinOperator?: 'AND' | 'OR';
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
  showJoinOperatorSelector: boolean; // For #and/#or selection
  isFilterMode: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  globalSearch?: string;

  // Dynamic multi-condition support (replaces hardcoded second* fields)
  activeConditionIndex?: number; // Which condition is currently being edited (0-based)
  pendingConditions?: FilterCondition[]; // Conditions being built (before confirmation)
  pendingJoinOperators?: ('AND' | 'OR')[]; // Join operators being built

  // Deprecated: kept for backward compatibility during migration
  /** @deprecated Use activeConditionIndex instead */
  isSecondOperator?: boolean;
  /** @deprecated Use pendingJoinOperators[0] instead */
  partialJoin?: 'AND' | 'OR';
  /** @deprecated Use pendingConditions[1]?.operator instead */
  secondOperator?: string;
  /** @deprecated Use pendingConditions[1]?.value instead */
  secondValue?: string;
  /** @deprecated Use pendingConditions[1]?.valueTo instead */
  secondValueTo?: string;
  /** @deprecated Use activeConditionIndex to determine */
  waitingForSecondValueTo?: boolean;
  /** @deprecated Use activeConditionIndex to determine */
  isSecondColumn?: boolean;
  /** @deprecated Use pendingConditions[1]?.column instead */
  secondColumn?: SearchColumn;
}
