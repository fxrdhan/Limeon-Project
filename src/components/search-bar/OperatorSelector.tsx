import React, { useMemo } from 'react';
import {
  LuCheck,
  LuX,
  LuSearch,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';
import BaseSelector, { BaseSelectorConfig } from './BaseSelector';

export interface FilterOperator {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface OperatorSelectorProps {
  operators: FilterOperator[];
  isOpen: boolean;
  onSelect: (operator: FilterOperator) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  operators,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
}) => {
  const config = useMemo((): BaseSelectorConfig<FilterOperator> => ({
    headerText: 'Pilih operator filter untuk kolom',
    footerSingular: 'operator',
    maxHeight: '320px',
    noResultsText: 'Tidak ada operator yang ditemukan untuk "{searchTerm}"',
    getItemKey: (operator) => operator.value,
    getItemLabel: (operator) => operator.label,
    getItemIcon: (operator) => operator.icon,
    getItemSecondaryText: (operator) => operator.value,
    getItemDescription: (operator) => operator.description,
    getSearchFields: (operator) => [
      { key: 'label', value: operator.label, boost: 1000 },
      { key: 'value', value: operator.value, boost: 500 },
      { key: 'description', value: operator.description || '', boost: 0 },
    ],
    theme: 'blue',
  }), []);

  return (
    <BaseSelector
      items={operators}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
    />
  );
};

export default OperatorSelector;

// Default operators
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_FILTER_OPERATORS: FilterOperator[] = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'Kolom mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-green-500" />,
  },
  {
    value: 'notContains',
    label: 'Not Contains',
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-red-500" />,
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <LuCheck className="w-3 h-3 text-blue-500" />,
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <LuX className="w-3 h-3 text-orange-500" />,
  },
  {
    value: 'startsWith',
    label: 'Starts With',
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <LuChevronRight className="w-3 h-3 text-purple-500" />,
  },
  {
    value: 'endsWith',
    label: 'Ends With',
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <LuChevronLeft className="w-3 h-3 text-indigo-500" />,
  },
];
