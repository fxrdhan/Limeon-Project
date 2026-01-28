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
  currentValue?: 'AND' | 'OR'; // Current join operator value for edit mode
}

const JoinOperatorSelector: React.FC<JoinOperatorSelectorProps> = ({
  operators,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
  currentValue,
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
      getItemActiveColor: operator => operator.activeColor || 'text-slate-900',
      getSearchFields: operator => [
        { key: 'label', value: operator.label, boost: 1000 },
      ],
      theme: 'orange',
    }),
    []
  );

  // Calculate default selected index based on current value
  const defaultSelectedIndex = useMemo(() => {
    if (!currentValue) return 0;
    const index = operators.findIndex(op => op.label === currentValue);
    return index >= 0 ? index : 0;
  }, [currentValue, operators]);

  return (
    <BaseSelector
      items={operators as JoinOperator[]}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
      defaultSelectedIndex={defaultSelectedIndex}
    />
  );
};

export default JoinOperatorSelector;
