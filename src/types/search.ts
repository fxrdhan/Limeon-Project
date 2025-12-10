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

export interface FilterSearch extends TargetedSearch {
  operator: string;
  valueTo?: string; // For inRange (Between) operator - second value
  isExplicitOperator?: boolean; // True if operator was explicitly selected via space pattern
  isConfirmed?: boolean; // True if value was confirmed with ## (Enter key)
  // Multi-condition support (up to MAX_FILTER_CONDITIONS)
  conditions?: FilterCondition[]; // Array of conditions for AND/OR (1 to N)
  joinOperators?: ('AND' | 'OR')[]; // Join operators between conditions (length = conditions.length - 1)
  isMultiCondition?: boolean; // Flag to indicate multi-condition filter (2+ conditions)
  isMultiColumn?: boolean; // Flag to indicate multi-column filter (conditions on different columns)
  // Deprecated: kept for backward compatibility, use joinOperators[0] instead
  joinOperator?: 'AND' | 'OR';
}

export interface EnhancedSearchState {
  globalSearch?: string;
  showColumnSelector: boolean;
  showOperatorSelector: boolean;
  showJoinOperatorSelector?: boolean; // True when join operator selector (AND/OR) is open
  isFilterMode: boolean;
  filterSearch?: FilterSearch;
  selectedColumn?: SearchColumn;

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
