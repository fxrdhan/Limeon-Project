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
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it('manages operator/join refs and lazy ref cache stability', () => {
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      useSearchInput({
        value: '#name #contains',
        searchMode: baseSearchMode(),
        onChange,
      })
    );

    const operatorEl = document.createElement('div');
    const joinEl = document.createElement('div');

    act(() => {
      result.current.setBadgeRef('condition-2-operator', operatorEl);
      result.current.setBadgeRef('join-1', joinEl);
    });

    expect(result.current.getOperatorRef(2)).toBe(operatorEl);
    expect(result.current.getJoinRef(1)).toBe(joinEl);

    const lazyOperatorRefA = result.current.getLazyOperatorRef(2);
    const lazyOperatorRefB = result.current.getLazyOperatorRef(2);
    const lazyJoinRefA = result.current.getLazyJoinRef(1);
    const lazyJoinRefB = result.current.getLazyJoinRef(1);

    expect(lazyOperatorRefA).toBe(lazyOperatorRefB);
    expect(lazyOperatorRefA.current).toBe(operatorEl);
    expect(lazyJoinRefA).toBe(lazyJoinRefB);
    expect(lazyJoinRefA.current).toBe(joinEl);
  });

  it('computes displayValue for condition N and partial-join inRange branches', () => {
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
          value: '#name #contains a #and #stock #inRange 500 #to',
          searchMode: baseSearchMode({
            activeConditionIndex: 2,
            partialConditions: [
              {
                field: 'name',
                operator: 'contains',
                value: 'a',
                column: nameColumn,
              },
              {
                field: 'stock',
                operator: 'equals',
                value: '10',
                column: stockColumn,
              },
              {
                field: 'stock',
                operator: 'inRange',
                value: '500',
                waitingForValueTo: true,
                column: stockColumn,
              },
            ],
          }),
        },
      }
    );

    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #contains a #and #stock #inRange 500 #to 700',
      searchMode: baseSearchMode({
        activeConditionIndex: 2,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'equals',
            value: '10',
            column: stockColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '500',
            valueTo: '700',
            column: stockColumn,
          },
        ],
      }),
    });
    expect(result.current.displayValue).toBe('700');

    rerender({
      value: '#name #contains a #and #stock #equals 10',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            waitingForValueTo: true,
            column: stockColumn,
          },
        ],
      }),
    });
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #contains a #and #stock #inRange 10 #to 20',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            valueTo: '20',
            column: stockColumn,
          },
        ],
      }),
    });
    expect(result.current.displayValue).toBe('20');
  });

  it('updates badge width CSS variable and resets when indicator is hidden', () => {
    vi.useFakeTimers();

    const onChange = vi.fn();
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    const resizeCallbacks: ResizeObserverCallback[] = [];

    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observeMock;
        disconnect = disconnectMock;
        constructor(cb: ResizeObserverCallback) {
          resizeCallbacks.push(cb);
        }
      }
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      })
    );

    const input = document.createElement('input');
    const inputRef = { current: input };
    const setPropertySpy = vi.spyOn(input.style, 'setProperty');
    const removePropertySpy = vi.spyOn(input.style, 'removeProperty');

    const { result, rerender } = renderHook(
      ({ searchMode }) =>
        useSearchInput({
          value: '#name #contains aspirin',
          searchMode,
          onChange,
          inputRef,
        }),
      {
        initialProps: {
          searchMode: baseSearchMode(),
        },
      }
    );

    const columnBadge = document.createElement('div');
    Object.defineProperty(columnBadge, 'offsetWidth', {
      configurable: true,
      get: () => 80,
    });

    act(() => {
      result.current.setBadgeRef('condition-0-column', columnBadge);
    });

    rerender({
      searchMode: baseSearchMode({
        isFilterMode: true,
        selectedColumn: nameColumn,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setPropertySpy).toHaveBeenCalledWith('--badge-width', '96px');
    expect(observeMock).toHaveBeenCalled();

    act(() => {
      resizeCallbacks[0]?.([] as ResizeObserverEntry[], {} as ResizeObserver);
      vi.advanceTimersByTime(16);
    });

    expect(setPropertySpy).toHaveBeenCalled();

    rerender({
      searchMode: baseSearchMode(),
    });

    expect(removePropertySpy).toHaveBeenCalledWith('--badge-width');
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('covers condition-N and operator-selector fallback branches in handleInputChange', () => {
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
          value: '#name #contains a #and #stock #inRange 500 #to',
          searchMode: baseSearchMode({
            isFilterMode: true,
            activeConditionIndex: 2,
            partialConditions: [
              {
                field: 'name',
                operator: 'contains',
                value: 'a',
                column: nameColumn,
              },
              {
                field: 'stock',
                operator: 'equals',
                value: '10',
                column: stockColumn,
              },
              {
                field: 'stock',
                operator: 'inRange',
                value: '500',
                waitingForValueTo: true,
                column: stockColumn,
              },
            ],
            filterSearch: {
              field: 'name',
              value: 'a',
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
        target: { value: '700' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 500 #to 700' },
      })
    );

    rerender({
      value: 'raw-pattern-without-hash-match',
      searchMode: baseSearchMode({
        isFilterMode: true,
        activeConditionIndex: 2,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'equals',
            value: '10',
            column: stockColumn,
          },
          {
            field: 'stock',
            operator: 'equals',
            value: 'old',
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: 'x' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'raw-pattern-without-hash-matchx' },
      })
    );

    rerender({
      value: 'plain value',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const passthroughEvent = {
      target: { value: 'next' },
    } as React.ChangeEvent<HTMLInputElement>;
    act(() => {
      result.current.handleInputChange(passthroughEvent);
    });
    expect(onChange).toHaveBeenCalledWith(passthroughEvent);

    rerender({
      value: '#name #',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: nameColumn,
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: '#eq' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #eq' },
      })
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(buildColumnValueMock).toHaveBeenCalledWith('name', 'plain');
  });

  it('reuses lazy column/badge refs from cache and covers displayValue edge branches', () => {
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
          value: '#name #contains a #and #stock #equals',
          searchMode: baseSearchMode({
            activeConditionIndex: 2,
            partialConditions: [
              {
                field: 'name',
                operator: 'contains',
                value: 'a',
                column: nameColumn,
              },
              {
                field: 'stock',
                operator: 'equals',
                value: '10',
                column: stockColumn,
              },
              {
                field: 'stock',
                operator: 'equals',
                column: stockColumn,
              },
            ],
          }),
        },
      }
    );

    expect(result.current.displayValue).toBe('');

    const lazyColumnA = result.current.getLazyColumnRef(0);
    const lazyColumnB = result.current.getLazyColumnRef(0);
    const lazyBadgeA = result.current.getLazyBadgeRef('condition-0-column');
    const lazyBadgeB = result.current.getLazyBadgeRef('condition-0-column');

    expect(lazyColumnA).toBe(lazyColumnB);
    expect(lazyBadgeA).toBe(lazyBadgeB);

    rerender({
      value: '#( #name #contains a #)##',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'name',
                column: nameColumn,
                operator: 'contains',
                value: 'a',
              },
            ],
          },
        },
      }),
    });
    expect(result.current.displayValue).toBe('');

    rerender({
      value: '#name #contains a #and #stock #equals current',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'equals',
            value: 'current',
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('current');

    rerender({
      value: '#stock #inRange 10 #to 20##',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          valueTo: '20',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });
    expect(result.current.displayValue).toBe('');
  });

  it('covers confirmed multi-condition rewrite loop and plain filter build fallback', () => {
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
          value:
            '#name #contains a #and #stock #equals 10 #or #name #equals b #and #code #equals c##',
          searchMode: baseSearchMode({
            isFilterMode: true,
            filterSearch: {
              field: 'name',
              value: 'a',
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
                  value: 'a',
                },
                {
                  field: 'stock',
                  column: stockColumn,
                  operator: 'equals',
                  value: '10',
                },
                {
                  field: 'name',
                  column: nameColumn,
                  operator: 'equals',
                  value: 'b',
                },
                {
                  field: 'code',
                  column: {
                    field: 'code',
                    headerName: 'Code',
                    searchable: true,
                    type: 'text',
                  },
                  operator: 'equals',
                  value: 'c',
                },
              ],
              joins: ['AND', 'OR', 'AND'],
            },
          }),
        },
      }
    );

    act(() => {
      result.current.handleInputChange({
        target: { value: 'updated' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          value:
            '#name #contains a #and #stock #equals 10 #or #equals b #and #code #equals updated',
        },
      })
    );

    rerender({
      value: '#name #contains old',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'old',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: false,
        },
      }),
    });

    act(() => {
      result.current.handleInputChange({
        target: { value: 'new' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(buildFilterValueMock).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains new' },
      })
    );
  });

  it('covers incomplete multi-condition value editing branches with #to and fallbacks', () => {
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
          value: '#name #contains a #and #stock #equals old',
          searchMode: baseSearchMode({
            partialJoin: 'AND',
            selectedColumn: stockColumn,
            activeConditionIndex: 1,
            partialConditions: [
              {
                field: 'name',
                operator: 'contains',
                value: 'a',
                column: nameColumn,
              },
              {
                field: 'stock',
                operator: 'equals',
                value: 'old',
                column: stockColumn,
              },
            ],
            filterSearch: {
              field: 'name',
              value: 'a',
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
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #equals' },
      })
    );

    rerender({
      value: '#name #contains a #and #stock #inRange 10 #to',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            waitingForValueTo: true,
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    act(() => {
      result.current.handleInputChange({
        target: { value: '20' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 10 #to 20' },
      })
    );

    rerender({
      value: '#name #contains a #and #stock #inRange',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            waitingForValueTo: true,
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    act(() => {
      result.current.handleInputChange({
        target: { value: '20' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 10 #to 20' },
      })
    );

    rerender({
      value: '#name #contains a #and #stock #inRange 10',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        selectedColumn: stockColumn,
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            valueTo: '30',
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });
    act(() => {
      result.current.handleInputChange({
        target: { value: '40' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 10 #to 40' },
      })
    );
  });
});
