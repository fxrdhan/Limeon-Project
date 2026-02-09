import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import ColumnSelector from './ColumnSelector';
import JoinOperatorSelector from './JoinOperatorSelector';
import OperatorSelector from './OperatorSelector';
import type { FilterOperator, SearchColumn } from '../../types';
import type { JoinOperator } from '../../operators';

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
];

const operators: FilterOperator[] = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'contains',
    icon: null,
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'equals',
    icon: null,
    activeColor: 'text-green-500',
  },
];

const joinOperators: JoinOperator[] = [
  {
    value: 'and',
    label: 'AND',
    description: 'and',
    icon: <span>AND</span>,
    activeColor: 'text-orange-600',
  },
  {
    value: 'or',
    label: 'OR',
    description: 'or',
    icon: <span>OR</span>,
    activeColor: 'text-orange-600',
  },
];

describe('search-bar selector wrappers', () => {
  it('passes expected config for ColumnSelector', () => {
    render(
      <ColumnSelector
        columns={columns}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 10, left: 20 }}
        searchTerm="na"
        defaultSelectedIndex={1}
        onHighlightChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('base-selector')).toBeInTheDocument();
    const props = baseSelectorMock.mock.calls.at(-1)?.[0] as {
      items: SearchColumn[];
      defaultSelectedIndex: number;
      config: {
        getItemKey: (column: SearchColumn) => string;
        getItemLabel: (column: SearchColumn) => string;
        getItemActiveColor: (column: SearchColumn) => string;
        getSearchFields: (
          column: SearchColumn
        ) => Array<{ key: string; value: string; boost?: number }>;
      };
    };

    expect(props.items).toEqual(columns);
    expect(props.defaultSelectedIndex).toBe(1);
    expect(props.config.getItemKey(columns[0])).toBe('name');
    expect(props.config.getItemLabel(columns[0])).toBe('Nama');
    expect(props.config.getItemActiveColor(columns[1])).toBe('text-blue-500');
    expect(props.config.getSearchFields(columns[0])).toEqual([
      { key: 'headerName', value: 'Nama', boost: 1000 },
    ]);

    const dateColumn: SearchColumn = {
      field: 'created_at',
      headerName: 'Tanggal',
      searchable: true,
      type: 'date',
    };
    const defaultColumn: SearchColumn = {
      field: 'description',
      headerName: 'Deskripsi',
      searchable: true,
      type: 'text',
    };

    const dateIcon = props.config.getItemIcon?.(
      dateColumn
    ) as React.ReactElement;
    const defaultIcon = props.config.getItemIcon?.(
      defaultColumn
    ) as React.ReactElement;
    const numericIcon = props.config.getItemIcon?.(
      columns[1]
    ) as React.ReactElement;

    expect(props.config.getItemActiveColor(dateColumn)).toBe('text-purple-500');
    expect(props.config.getItemActiveColor(defaultColumn)).toBe(
      'text-purple-500'
    );
    expect(dateIcon.props.className).toContain('w-4');
    expect(defaultIcon.props.className).toContain('w-4');
    expect(numericIcon.props.className).toContain('w-5');
  });

  it('passes expected config for OperatorSelector', () => {
    render(
      <OperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 5, left: 8 }}
        searchTerm="eq"
        defaultSelectedIndex={0}
        onHighlightChange={vi.fn()}
      />
    );

    const props = baseSelectorMock.mock.calls.at(-1)?.[0] as {
      config: {
        theme?: string;
        getItemKey: (operator: FilterOperator) => string;
        getItemLabel: (operator: FilterOperator) => string;
        getItemIcon: (operator: FilterOperator) => React.ReactNode;
        getItemActiveColor: (operator: FilterOperator) => string;
        getSearchFields: (
          operator: FilterOperator
        ) => Array<{ key: string; value: string; boost?: number }>;
      };
    };

    expect(props.config.theme).toBe('blue');
    expect(props.config.getItemKey(operators[0])).toBe('contains');
    expect(props.config.getItemLabel(operators[0])).toBe('Contains');
    expect(props.config.getItemIcon(operators[0])).toBeNull();
    expect(props.config.getSearchFields(operators[0])).toEqual([
      { key: 'label', value: 'Contains', boost: 1000 },
    ]);
    expect(props.config.getItemActiveColor(operators[1])).toBe(
      'text-green-500'
    );
    expect(props.config.getItemActiveColor(operators[0])).toBe(
      'text-slate-900'
    );
  });

  it('calculates default index for JoinOperatorSelector from current value', () => {
    render(
      <JoinOperatorSelector
        operators={joinOperators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        currentValue="OR"
      />
    );

    let props = baseSelectorMock.mock.calls.at(-1)?.[0] as {
      defaultSelectedIndex: number;
      config: { theme?: string };
    };

    expect(props.defaultSelectedIndex).toBe(1);
    expect(props.config.theme).toBe('orange');

    render(
      <JoinOperatorSelector
        operators={joinOperators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
      />
    );

    props = baseSelectorMock.mock.calls.at(-1)?.[0] as {
      defaultSelectedIndex: number;
      config: {
        getItemKey: (operator: JoinOperator) => string;
        getItemLabel: (operator: JoinOperator) => string;
        getItemIcon: (operator: JoinOperator) => React.ReactNode;
        getItemActiveColor: (operator: JoinOperator) => string;
        getSearchFields: (
          operator: JoinOperator
        ) => Array<{ key: string; value: string; boost?: number }>;
      };
    };
    expect(props.defaultSelectedIndex).toBe(0);
    expect(
      props.config.getItemActiveColor({
        ...joinOperators[0],
        activeColor: undefined,
      })
    ).toBe('text-slate-900');
    expect(props.config.getItemKey(joinOperators[0])).toBe('and');
    expect(props.config.getItemLabel(joinOperators[1])).toBe('OR');
    expect(props.config.getItemIcon(joinOperators[0])).toEqual(
      <span>AND</span>
    );
    expect(props.config.getSearchFields(joinOperators[1])).toEqual([
      { key: 'label', value: 'OR', boost: 1000 },
    ]);

    render(
      <JoinOperatorSelector
        operators={joinOperators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        currentValue={'UNKNOWN' as never}
      />
    );
    props = baseSelectorMock.mock.calls.at(-1)?.[0] as {
      defaultSelectedIndex: number;
    };
    expect(props.defaultSelectedIndex).toBe(0);
  });
});
