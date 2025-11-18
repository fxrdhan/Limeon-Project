import React, { useMemo } from 'react';
import BaseSelector from './BaseSelector';
import {
  FilterOperator,
  OperatorSelectorProps,
  BaseSelectorConfig,
} from '../../types';

const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  operators,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
  defaultSelectedIndex,
}) => {
  const config = useMemo(
    (): BaseSelectorConfig<FilterOperator> => ({
      headerText: 'Pilih operator filter untuk kolom',
      footerSingular: 'operator',
      maxHeight: '320px',
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
      theme: 'blue',
    }),
    []
  );

  return (
    <BaseSelector
      items={operators}
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

export default OperatorSelector;
