import React, { useMemo } from 'react';
import { LuHash, LuSearch, LuFilter } from 'react-icons/lu';
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
}) => {
  const getColumnIcon = (column: SearchColumn) => {
    switch (column.type) {
      case 'number':
      case 'currency':
        return <LuHash className="w-3 h-3 text-blue-500" />;
      case 'date':
        return <LuFilter className="w-3 h-3 text-purple-500" />;
      default:
        return <LuSearch className="w-3 h-3 text-purple-500" />;
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
      getItemSecondaryText: column => column.field,
      getItemDescription: column => column.description || '',
      getSearchFields: column => [
        { key: 'headerName', value: column.headerName, boost: 1000 },
        { key: 'field', value: column.field, boost: 500 },
        { key: 'description', value: column.description || '', boost: 0 },
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
    />
  );
};

export default ColumnSelector;
