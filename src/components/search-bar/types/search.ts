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
  joinOperator?: 'AND' | 'OR'; // Primary join operator (backward compat)
  joins?: ('AND' | 'OR')[]; // Full joins array for N-condition (joins[i] between condition[i] and condition[i+1])
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
  showJoinOperatorSelector: boolean; // for #and/#or selection
  isFilterMode: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  globalSearch?: string;
  partialJoin?: 'AND' | 'OR'; // selected join operator before next condition

  // ============ Scalable N-condition support ============

  /**
   * Index of the condition currently being BUILT (input phase)
   * 0 = first condition, 1 = second condition, etc.
   * undefined means first condition (default)
   *
   * Usage: activeConditionIndex > 0 means we're building a subsequent condition
   */
  activeConditionIndex?: number;

  /**
   * Index of the condition currently being EDITED (badge edit mode)
   * undefined means no specific condition is being edited
   *
   * This is different from activeConditionIndex:
   * - activeConditionIndex: building NEW condition
   * - editingConditionIndex: editing EXISTING condition badge
   */
  editingConditionIndex?: number;

  /**
   * Partial conditions being built (not yet confirmed)
   * Each entry contains partial data for a condition being typed
   * partialConditions[0] = first condition data
   * partialConditions[1] = second condition data (column, operator, value, etc.)
   */
  partialConditions?: PartialCondition[];

  /**
   * Array of join operators between conditions
   * joins[0] = join between condition 0 and 1
   * joins[1] = join between condition 1 and 2
   * etc.
   */
  joins?: ('AND' | 'OR')[];

  /**
   * Index of the join operator currently being EDITED
   * undefined means no specific join is being edited (or building new join at end)
   *
   * editingJoinIndex[0] = editing join between condition 0 and 1
   * editingJoinIndex[1] = editing join between condition 1 and 2
   * etc.
   */
  editingJoinIndex?: number;
}

/**
 * Represents a condition that is being typed/built but not yet confirmed
 * Used during the input process before user presses Enter
 */
export interface PartialCondition {
  /** Column field name for this condition */
  field?: string;
  /** Column reference */
  column?: SearchColumn;
  /** Operator value (e.g., 'contains', 'equals', 'inRange') */
  operator?: string;
  /** Primary value */
  value?: string;
  /** Secondary value for Between operator */
  valueTo?: string;
  /** Flag: waiting for user to enter valueTo (Between operator) */
  waitingForValueTo?: boolean;
}
