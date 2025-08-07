import React from 'react';
import { SearchColumn } from './search';

export interface FilterOperator {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export interface BaseSelectorConfig<T> {
  headerText: string;
  footerSingular: string;
  maxHeight: string;
  noResultsText: string;
  getItemKey: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemIcon: (item: T) => React.ReactNode;
  getItemSecondaryText?: (item: T) => string;
  getItemDescription?: (item: T) => string;
  getSearchFields: (
    item: T
  ) => Array<{ key: string; value: string; boost?: number }>;
  theme?: 'purple' | 'blue';
}

export interface BaseSelectorProps<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
  config: BaseSelectorConfig<T>;
}

export interface ColumnSelectorProps {
  columns: SearchColumn[];
  isOpen: boolean;
  onSelect: (column: SearchColumn) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}

export interface OperatorSelectorProps {
  operators: FilterOperator[];
  isOpen: boolean;
  onSelect: (operator: FilterOperator) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}
