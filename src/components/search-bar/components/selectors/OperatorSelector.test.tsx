import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterOperator } from '../../types';
import OperatorSelector from './OperatorSelector';

const baseSelectorMock = vi.hoisted(() => vi.fn());

vi.mock('./BaseSelector', () => ({
  default: (props: unknown) => {
    baseSelectorMock(props);
    return <div data-testid="base-selector" />;
  },
}));

const operators: FilterOperator[] = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'Contains text',
    icon: null,
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Equals text',
    icon: <span>eq</span>,
    activeColor: 'text-green-500',
  },
];

describe('OperatorSelector', () => {
  beforeEach(() => {
    baseSelectorMock.mockReset();
  });

  it('uses active-color fallback and mapped config callbacks', () => {
    render(
      <OperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 5, left: 8 }}
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      searchTerm: string;
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

    expect(props.searchTerm).toBe('');
    expect(props.config.theme).toBe('blue');
    expect(props.config.getItemKey(operators[0])).toBe('contains');
    expect(props.config.getItemLabel(operators[1])).toBe('Equals');
    expect(props.config.getItemIcon(operators[0])).toBeNull();
    expect(props.config.getItemActiveColor(operators[0])).toBe(
      'text-slate-900'
    );
    expect(props.config.getItemActiveColor(operators[1])).toBe(
      'text-green-500'
    );
    expect(props.config.getSearchFields(operators[1])).toEqual([
      { key: 'label', value: 'Equals', boost: 1000 },
    ]);
  });

  it('forwards defaultSelectedIndex and highlight callback', () => {
    const onHighlightChange = vi.fn();

    render(
      <OperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 1, left: 2 }}
        searchTerm="eq"
        defaultSelectedIndex={1}
        onHighlightChange={onHighlightChange}
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      items: FilterOperator[];
      searchTerm: string;
      defaultSelectedIndex: number;
      onHighlightChange: unknown;
    };

    expect(props.items).toEqual(operators);
    expect(props.searchTerm).toBe('eq');
    expect(props.defaultSelectedIndex).toBe(1);
    expect(props.onHighlightChange).toBe(onHighlightChange);
  });
});
