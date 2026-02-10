import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOIN_OPERATORS } from '../../operators';
import type { JoinOperator } from '../../operators';
import JoinOperatorSelector from './JoinOperatorSelector';

const baseSelectorMock = vi.hoisted(() => vi.fn());

vi.mock('./BaseSelector', () => ({
  default: (props: unknown) => {
    baseSelectorMock(props);
    return <div data-testid="base-selector" />;
  },
}));

const operators: JoinOperator[] = [...JOIN_OPERATORS];

describe('JoinOperatorSelector', () => {
  beforeEach(() => {
    baseSelectorMock.mockReset();
  });

  it('computes default index from current value and falls back when missing', () => {
    render(
      <JoinOperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        currentValue="OR"
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      defaultSelectedIndex: number;
      searchTerm: string;
      config: {
        theme?: string;
        getItemActiveColor: (operator: JoinOperator) => string;
      };
    };

    expect(props.defaultSelectedIndex).toBe(1);
    expect(props.searchTerm).toBe('');
    expect(props.config.theme).toBe('orange');
    expect(props.config.getItemActiveColor(operators[0])).toBe('text-blue-600');
    expect(
      props.config.getItemActiveColor({
        ...operators[1],
        activeColor: undefined,
      } as unknown as JoinOperator)
    ).toBe('text-slate-900');

    render(
      <JoinOperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        currentValue={'UNKNOWN' as never}
      />
    );

    const unknownValueProps = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      defaultSelectedIndex: number;
    };

    expect(unknownValueProps.defaultSelectedIndex).toBe(0);
  });

  it('defaults to first option when current value is not provided', () => {
    render(
      <JoinOperatorSelector
        operators={operators}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 10, left: 10 }}
      />
    );

    const props = baseSelectorMock.mock.calls[
      baseSelectorMock.mock.calls.length - 1
    ]?.[0] as {
      items: JoinOperator[];
      defaultSelectedIndex: number;
      config: {
        getItemKey: (operator: JoinOperator) => string;
        getItemLabel: (operator: JoinOperator) => string;
      };
    };

    expect(props.items).toEqual(operators);
    expect(props.defaultSelectedIndex).toBe(0);
    expect(props.config.getItemKey(operators[0])).toBe('and');
    expect(props.config.getItemLabel(operators[1])).toBe('OR');
  });
});
