import React, { useMemo } from 'react';
import BaseSelector from './BaseSelector';
import { JoinOperator } from '../../operators';
import { BaseSelectorConfig } from '../../types';

interface JoinOperatorSelectorProps {
  operators: readonly JoinOperator[];
  isOpen: boolean;
  onSelect: (operator: JoinOperator) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}

const JoinOperatorSelector: React.FC<JoinOperatorSelectorProps> = ({
  operators,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
}) => {
  const config = useMemo(
    (): BaseSelectorConfig<JoinOperator> => ({
      headerText: 'Pilih operator join untuk kondisi',
      footerSingular: 'operator',
      maxHeight: '200px',
      noResultsText: 'Tidak ada operator yang ditemukan untuk "{searchTerm}"',
      getItemKey: operator => operator.value,
      getItemLabel: operator => operator.label,
      getItemIcon: operator => operator.icon,
      getItemActiveColor: operator => operator.activeColor || 'text-gray-900',
      getSearchFields: operator => [
        { key: 'label', value: operator.label, boost: 1000 },
        { key: 'value', value: operator.value, boost: 500 },
        { key: 'description', value: operator.description || '', boost: 0 },
      ],
      theme: 'purple',
    }),
    []
  );

  return (
    <BaseSelector
      items={operators as JoinOperator[]}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
    />
  );
};

export default JoinOperatorSelector;
