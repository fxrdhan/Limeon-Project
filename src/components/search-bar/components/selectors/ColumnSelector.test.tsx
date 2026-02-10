import { render } from '@testing-library/react';
import React from 'react';
import { TbFilter, TbNumber12Small, TbTypography } from 'react-icons/tb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchColumn } from '../../types';
import ColumnSelector from './ColumnSelector';

const baseSelectorMock = vi.hoisted(() => vi.fn());

vi.mock('./BaseSelector', () => ({
  default: (props: unknown) => {
    baseSelectorMock(props);
    return <div data-testid="base-selector" />;
  },
}));

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
  },
  {
    field: 'price',
    headerName: 'Harga',
    searchable: true,
    type: 'currency',
  },
  {
    field: 'quantity',
    headerName: 'Jumlah',
    searchable: true,
    type: 'number',
  },
  {
    field: 'created_at',
    headerName: 'Tanggal',
    searchable: true,
    type: 'date',
  },
];

describe('ColumnSelector', () => {
  beforeEach(() => {
    baseSelectorMock.mockReset();
  });

  it('uses icon and active-color branches for all column types', () => {
    render(
      <ColumnSelector
        columns={columns}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 10, left: 20 }}
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      config: {
        getItemIcon: (column: SearchColumn) => React.ReactElement;
        getItemActiveColor: (column: SearchColumn) => string;
      };
    };

    const textIcon = props.config.getItemIcon(columns[0]);
    const currencyIcon = props.config.getItemIcon(columns[1]);
    const numberIcon = props.config.getItemIcon(columns[2]);
    const dateIcon = props.config.getItemIcon(columns[3]);

    expect(textIcon.type).toBe(TbTypography);
    expect(currencyIcon.type).toBe(TbNumber12Small);
    expect(numberIcon.type).toBe(TbNumber12Small);
    expect(dateIcon.type).toBe(TbFilter);

    expect(props.config.getItemActiveColor(columns[0])).toBe('text-purple-500');
    expect(props.config.getItemActiveColor(columns[1])).toBe('text-blue-500');
    expect(props.config.getItemActiveColor(columns[2])).toBe('text-blue-500');
    expect(props.config.getItemActiveColor(columns[3])).toBe('text-purple-500');
  });

  it('forwards selector props and applies empty search-term default', () => {
    const onHighlightChange = vi.fn();

    render(
      <ColumnSelector
        columns={columns}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 2, left: 4 }}
        defaultSelectedIndex={2}
        onHighlightChange={onHighlightChange}
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      items: SearchColumn[];
      searchTerm: string;
      defaultSelectedIndex: number;
      onHighlightChange: unknown;
      config: {
        getSearchFields: (
          column: SearchColumn
        ) => Array<{ key: string; value: string; boost?: number }>;
      };
    };

    expect(props.items).toEqual(columns);
    expect(props.searchTerm).toBe('');
    expect(props.defaultSelectedIndex).toBe(2);
    expect(props.onHighlightChange).toBe(onHighlightChange);
    expect(props.config.getSearchFields(columns[0])).toEqual([
      { key: 'headerName', value: 'Nama', boost: 1000 },
    ]);
  });
});
