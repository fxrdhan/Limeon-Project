import type {
  EnhancedSearchBarProps as CoreEnhancedSearchBarProps,
  EnhancedSearchState as CoreEnhancedSearchState,
  FilterCondition as CoreFilterCondition,
  FilterConditionNode as CoreFilterConditionNode,
  FilterGroup as CoreFilterGroup,
  FilterSearch as CoreFilterSearch,
  SearchColumn as CoreSearchColumn,
} from '@/types/search';
import { SearchState } from '../constants';

export type SearchColumn = CoreSearchColumn & {
  activeColor?: string;
};

export interface FilterCondition extends Omit<CoreFilterCondition, 'column'> {
  column?: SearchColumn;
}

export interface FilterConditionNode extends Omit<
  CoreFilterConditionNode,
  'column'
> {
  column?: SearchColumn;
}

export interface FilterGroup extends Omit<CoreFilterGroup, 'nodes'> {
  nodes: FilterExpression[];
}

export type FilterExpression = FilterConditionNode | FilterGroup;

export interface FilterSearch extends Omit<
  CoreFilterSearch,
  'column' | 'conditions' | 'filterGroup'
> {
  column: SearchColumn;
  isExplicitOperator: boolean;
  conditions?: FilterCondition[];
  joins?: ('AND' | 'OR')[];
  filterGroup?: FilterGroup;
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
  showNotFoundArrow?: boolean;
}

export interface EnhancedSearchBarProps
  extends
    Omit<CoreEnhancedSearchBarProps, 'columns' | 'onFilterSearch'>,
    TableSearchProps {
  columns: SearchColumn[];
  onGlobalSearch?: (term: string) => void;
  onFilterSearch?: (filter: FilterSearch | null) => void;
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

export interface EnhancedSearchState extends Omit<
  CoreEnhancedSearchState,
  | 'showJoinOperatorSelector'
  | 'selectedColumn'
  | 'filterSearch'
  | 'joins'
  | 'partialConditions'
> {
  showJoinOperatorSelector: boolean;
  selectedColumn?: SearchColumn;
  filterSearch?: FilterSearch;
  partialConditions?: PartialCondition[];
  joins?: ('AND' | 'OR')[];
  activeConditionIndex?: number;
  editingConditionIndex?: number;
  editingJoinIndex?: number;
}
