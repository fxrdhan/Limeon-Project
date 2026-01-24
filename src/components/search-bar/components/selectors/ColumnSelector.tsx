import React, { useMemo } from 'react';
import { TbFilter, TbNumber12Small, TbTypography } from 'react-icons/tb';
import BaseSelector from './BaseSelector';
import {
  SearchColumn,
  ColumnSelectorProps,
  BaseSelectorConfig,
} from '../../types';

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
  defaultSelectedIndex,
  onHighlightChange,
}) => {
  const getColumnIcon = (column: SearchColumn) => {
    switch (column.type) {
      case 'number':
      case 'currency':
        return <TbNumber12Small className="w-5 h-5" />;
      case 'date':
        return <TbFilter className="w-4 h-4" />;
      default:
        return <TbTypography className="w-4 h-4" />;
    }
  };

  const getActiveColor = (column: SearchColumn) => {
    switch (column.type) {
      case 'number':
      case 'currency':
        return 'text-blue-500';
      case 'date':
        return 'text-purple-500';
      default:
        return 'text-purple-500';
    }
  };

  const config = useMemo(
    (): BaseSelectorConfig<SearchColumn> => ({
      headerText: 'Pilih kolom untuk pencarian targeted',
      footerSingular: 'kolom',
      maxHeight: '320px',
      noResultsText: 'Tidak ada kolom yang ditemukan untuk "{searchTerm}"',
      getItemKey: column => column.field,
      getItemLabel: column => column.headerName,
      getItemIcon: getColumnIcon,
      getItemActiveColor: getActiveColor,
      getSearchFields: column => [
        { key: 'headerName', value: column.headerName, boost: 1000 },
      ],
    }),
    []
  );

  return (
    <BaseSelector
      items={columns}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
      defaultSelectedIndex={defaultSelectedIndex}
      onHighlightChange={onHighlightChange}
    />
  );
};

export default ColumnSelector;
