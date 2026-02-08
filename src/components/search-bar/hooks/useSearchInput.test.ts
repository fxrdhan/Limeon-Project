import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { EnhancedSearchState, SearchColumn } from '../types';
import { useSearchInput } from './useSearchInput';

const buildColumnValueMock = vi.hoisted(() => vi.fn());
const buildFilterValueMock = vi.hoisted(() => vi.fn());
const getOperatorSearchTermMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/searchUtils', () => ({
  buildColumnValue: buildColumnValueMock,
  buildFilterValue: buildFilterValueMock,
  getOperatorSearchTerm: getOperatorSearchTermMock,
}));

const nameColumn: SearchColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text',
};

const stockColumn: SearchColumn = {
  field: 'stock',
  headerName: 'Stock',
  searchable: true,
  type: 'number',
};

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

describe('useSearchInput', () => {
  beforeEach(() => {
    buildColumnValueMock.mockReset();
    buildFilterValueMock.mockReset();
    getOperatorSearchTermMock.mockReset();

    buildColumnValueMock.mockImplementation(
      (column: string, mode: string) => `#${column}:${mode}`
    );
    buildFilterValueMock.mockImplementation(
      (filter, inputValue) =>
        `#${filter.field} #${filter.operator} ${inputValue}`
    );
    getOperatorSearchTermMock.mockReturnValue('operator-term');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manages dynamic badge refs and lazy refs', () => {
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      useSearchInput({
        value: '#name',
        searchMode: baseSearchMode(),
        onChange,
      })
    );

    const el = document.createElement('div');

    act(() => {
      result.current.setBadgeRef('condition-0-column', el);
    });

    expect(result.current.getBadgeRef('condition-0-column')).toBe(el);
    expect(result.current.getColumnRef(0)).toBe(el);

    const lazyColumnRef = result.current.getLazyColumnRef(0);
    const lazyBadgeRef = result.current.getLazyBadgeRef('condition-0-column');
    expect(lazyColumnRef.current).toBe(el);
    expect(lazyBadgeRef.current).toBe(el);

    act(() => {
      result.current.setBadgeRef('condition-0-column', null);
    });

    expect(result.current.getBadgeRef('condition-0-column')).toBeNull();
  });

  it('computes operatorSearchTerm, showTargetedIndicator, and selector-hidden display', () => {
    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange: vi.fn(),
        }),
      {
        initialProps: {
          value: '#name #co',
          searchMode: baseSearchMode({ showColumnSelector: true }),
        },
      }
    );

    expect(result.current.operatorSearchTerm).toBe('operator-term');
    expect(result.current.showTargetedIndicator).toBe(false);
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #co',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: nameColumn,
      }),
    });
    expect(result.current.showTargetedIndicator).toBe(true);
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #co',
      searchMode: baseSearchMode({
        showJoinOperatorSelector: true,
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('');
  });

  it('computes displayValue for filter and selected-column states', () => {
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange,
        }),
      {
        initialProps: {
          value: '#stock #inRange 10 #to 20',
          searchMode: baseSearchMode({
            isFilterMode: true,
            filterSearch: {
              field: 'stock',
              value: '10',
              valueTo: '20',
              operator: 'inRange',
              column: stockColumn,
              isExplicitOperator: true,
              isConfirmed: false,
            },
          }),
        },
      }
    );

    expect(result.current.displayValue).toBe('20');

    rerender({
      value: '#stock #inRange 10',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          waitingForValueTo: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #contains aspirin##',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #contains aspirin',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('aspirin');

    rerender({
      value: '#name',
      searchMode: baseSearchMode({ selectedColumn: nameColumn }),
    });
    expect(result.current.displayValue).toBe('');

    rerender({
      value: 'raw value',
      searchMode: baseSearchMode(),
    });
    expect(result.current.displayValue).toBe('raw value');
  });

  it('handles confirmed filter hash/space trigger and multi-condition typing', () => {
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange,
        }),
      {
        initialProps: {
          value: '#name #contains asp##',
          searchMode: baseSearchMode({
            isFilterMode: true,
            filterSearch: {
              field: 'name',
              value: 'asp',
              operator: 'contains',
              column: nameColumn,
              isExplicitOperator: true,
              isConfirmed: true,
            },
          }),
        },
      }
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: '#' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains asp #' },
      })
    );

    rerender({
      value: '#name #contains aspirin #and #equals ibuprofen##',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          conditions: [
            {
              field: 'name',
              column: nameColumn,
              operator: 'contains',
              value: 'aspirin',
            },
            {
              field: 'name',
              column: nameColumn,
              operator: 'equals',
              value: 'ibuprofen',
            },
          ],
          joins: ['AND'],
        },
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: 'paracetamol' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          value: '#name #contains aspirin #and #equals paracetamol',
        },
      })
    );
  });

  it('handles inRange waiting/valueTo and condition N typing branches', () => {
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange,
        }),
      {
        initialProps: {
          value: '#stock #inRange 10 #to',
          searchMode: baseSearchMode({
            isFilterMode: true,
            filterSearch: {
              field: 'stock',
              value: '10',
              operator: 'inRange',
              column: stockColumn,
              isExplicitOperator: true,
              waitingForValueTo: true,
            },
          }),
        },
      }
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: '20' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#stock #inRange 10 #to 20' },
      })
    );

    rerender({
      value: '#name #contains a #and #stock #equals old',
      searchMode: baseSearchMode({
        isFilterMode: true,
        activeConditionIndex: 2,
        partialJoin: 'AND',
        partialConditions: [
          {
            field: 'name',
            column: nameColumn,
            operator: 'contains',
            value: 'a',
          },
          {
            field: 'name',
            column: nameColumn,
            operator: 'equals',
            value: 'b',
          },
          {
            field: 'stock',
            column: stockColumn,
            operator: 'equals',
            value: 'old',
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiCondition: true,
          conditions: [
            {
              field: 'name',
              column: nameColumn,
              operator: 'contains',
              value: 'a',
            },
            {
              field: 'name',
              column: nameColumn,
              operator: 'equals',
              value: 'b',
            },
          ],
        },
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: 'new' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #equals new' },
      })
    );
  });

  it('handles join-selector, multi-column selector, and selected column input modes', () => {
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange,
        }),
      {
        initialProps: {
          value: '#name #contains asp #',
          searchMode: baseSearchMode({
            showJoinOperatorSelector: true,
            filterSearch: {
              field: 'name',
              value: 'asp',
              operator: 'contains',
              column: nameColumn,
              isExplicitOperator: true,
            },
          }),
        },
      }
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: 'ibu' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(buildFilterValueMock).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains ibu' },
      })
    );

    rerender({
      value: '#name #contains asp #and #',
      searchMode: baseSearchMode({
        showColumnSelector: true,
        activeConditionIndex: 1,
        partialJoin: 'AND',
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          valueTo: 'x',
          isExplicitOperator: true,
        },
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: 'stock' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains asp x #and #stock' },
      })
    );

    rerender({
      value: '#name',
      searchMode: baseSearchMode({ selectedColumn: nameColumn }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: ' ' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(buildColumnValueMock).toHaveBeenCalledWith('name', 'space');

    act(() => {
      result.current.handleInputChange({
        target: { value: ':' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(buildColumnValueMock).toHaveBeenCalledWith('name', 'colon');

    act(() => {
      result.current.handleInputChange({
        target: { value: 'aspirin' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name:aspirin' },
      })
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(buildColumnValueMock).toHaveBeenCalledWith('name', 'plain');
  });

  it('handles default fallback branch and first-space trigger', () => {
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ value, searchMode }) =>
        useSearchInput({
          value,
          searchMode,
          onChange,
        }),
      {
        initialProps: {
          value: '',
          searchMode: baseSearchMode(),
        },
      }
    );

    const firstSpaceEvent = {
      target: { value: ' ' },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputChange(firstSpaceEvent);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '#' } })
    );

    rerender({
      value: 'already typed',
      searchMode: baseSearchMode(),
    });

    const passthroughEvent = {
      target: { value: 'next' },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputChange(passthroughEvent);
    });

    expect(onChange).toHaveBeenCalledWith(passthroughEvent);
  });
});
