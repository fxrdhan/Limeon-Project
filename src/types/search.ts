export interface SearchColumn {
  field: string;
  headerName: string;
  searchable: boolean;
  type?: 'text' | 'number' | 'date' | 'currency';
  description?: string;
}

export interface TargetedSearch {
  field: string;
  value: string;
  column: SearchColumn;
}

export interface EnhancedSearchState {
  isTargeted: boolean;
  targetedSearch?: TargetedSearch;
  globalSearch?: string;
  showColumnSelector: boolean;
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
  searchState?: "idle" | "typing" | "found" | "not-found";
  resultsCount?: number;
  columns: SearchColumn[];
  onTargetedSearch?: (targetedSearch: TargetedSearch | null) => void;
  onGlobalSearch?: (search: string) => void;
  onClearSearch?: () => void;
}