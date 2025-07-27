// UI State and Interaction Types

export interface TableColumn {
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface SearchState {
  query: string;
  isActive: boolean;
  results: unknown[];
}

export interface ModalState {
  isOpen: boolean;
  isClosing: boolean;
  data?: unknown;
}

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

export interface ErrorState {
  hasError: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  touchedFields: string[];
}

export interface FormUIState {
  activeTab?: string;
  expandedSections: string[];
  isDirty: boolean;
  isSubmitting: boolean;
  lastSavedAt?: string;
}

export interface DropdownState {
  isOpen: boolean;
  selectedValue?: string;
  searchTerm?: string;
}

export interface TooltipState {
  isVisible: boolean;
  position: { x: number; y: number };
  content?: string;
}