import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState, SearchColumn } from '../../types';
import type { PreservedFilter } from '../../utils/handlerHelpers';

const setFilterValueMock = vi.hoisted(() => vi.fn());
const isOperatorCompatibleWithColumnMock = vi.hoisted(() => vi.fn());

vi.mock('../../utils/handlerHelpers', async () => {
  const actual = await vi.importActual<
    typeof import('../../utils/handlerHelpers')
  >('../../utils/handlerHelpers');
  return {
    ...actual,
    setFilterValue: setFilterValueMock,
  };
});

vi.mock('../../utils/operatorUtils', () => ({
  isOperatorCompatibleWithColumn: isOperatorCompatibleWithColumnMock,
}));

import {
  getActiveConditionIndex,
  getColumnAt,
  handleColumnSelectMultiColumn,
  handleColumnSelectWithPreservedFilter,
  isBuildingConditionN,
} from './useColumnSelection';

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

const codeColumn: SearchColumn = {
  field: 'code',
  headerName: 'Code',
  searchable: true,
  type: 'text',
};

describe('useColumnSelection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setFilterValueMock.mockReset();
    isOperatorCompatibleWithColumnMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exposes helper selectors for active condition and column lookup', () => {
    const state: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      activeConditionIndex: 2,
      partialConditions: [{}, { column: stockColumn }],
    };

    expect(getActiveConditionIndex(state)).toBe(2);
    expect(isBuildingConditionN(state)).toBe(true);
    expect(getColumnAt(state, 1)).toEqual(stockColumn);

    expect(
      getActiveConditionIndex({
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: false,
      })
    ).toBe(0);
  });

  it('handles multi-column selection with compatible preserved second condition and value', () => {
    isOperatorCompatibleWithColumnMock.mockReturnValue(true);

    const preservedRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '10' },
        ],
        joins: ['AND'],
      },
    } as RefObject<PreservedFilter | null>;

    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'AND',
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: nameColumn,
        isExplicitOperator: true,
      },
    };

    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const onChange = vi.fn();
    const focus = vi.fn();
    const inputRef = {
      current: { focus },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleColumnSelectMultiColumn(
      stockColumn,
      searchMode,
      preservedRef,
      null,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #and #stock #equals 10##',
      onChange,
      inputRef
    );
    expect(preservedRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenCalledWith(null);
    expect(setIsEditingSecondOperator).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(focus).toHaveBeenCalled();
  });

  it('handles incompatible second operator by opening operator selector on second condition', () => {
    isOperatorCompatibleWithColumnMock.mockReturnValue(false);

    const preservedRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'greaterThan', value: '' },
        ],
        joins: ['OR'],
      },
    } as RefObject<PreservedFilter | null>;

    const preservedSearchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: nameColumn,
        isExplicitOperator: true,
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'greaterThan', value: '' },
        ],
      },
    };

    const searchMode: EnhancedSearchState = {
      ...preservedSearchMode,
      partialJoin: 'OR',
    };

    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleColumnSelectMultiColumn(
      stockColumn,
      searchMode,
      preservedRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #or #stock #',
      onChange,
      inputRef
    );
    expect(preservedRef.current?.conditions?.[1]?.field).toBe('stock');
    expect(setIsEditingSecondOperator).toHaveBeenCalledWith(true);
    expect(setPreservedSearchMode).toHaveBeenCalledWith(
      expect.objectContaining({
        showOperatorSelector: true,
      })
    );
  });

  it('handles preserved filter compatibility and incompatible fallback', () => {
    const onChange = vi.fn();
    const setPreservedSearchMode = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    const compatibleRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'equals', value: 'ibuprofen' },
        ],
        joins: ['AND'],
        isMultiColumn: false,
      },
    } as RefObject<PreservedFilter | null>;

    isOperatorCompatibleWithColumnMock.mockReturnValue(true);

    handleColumnSelectWithPreservedFilter(
      stockColumn,
      compatibleRef,
      null,
      setPreservedSearchMode,
      [nameColumn, stockColumn],
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #contains aspirin #and  #equals ibuprofen##',
      onChange,
      inputRef
    );
    expect(compatibleRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenCalledWith(null);

    const incompatibleRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '' },
        ],
        joins: ['AND'],
        isMultiColumn: true,
      },
    } as RefObject<PreservedFilter | null>;

    const preservedSearchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: nameColumn,
        isExplicitOperator: true,
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '' },
        ],
      },
    };

    isOperatorCompatibleWithColumnMock.mockReturnValue(false);

    handleColumnSelectWithPreservedFilter(
      stockColumn,
      incompatibleRef,
      preservedSearchMode,
      setPreservedSearchMode,
      [nameColumn, stockColumn],
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#stock #',
      onChange,
      inputRef
    );
    expect(incompatibleRef.current?.conditions?.[0]?.field).toBe('stock');
    expect(incompatibleRef.current?.conditions?.[0]?.operator).toBe('');
    expect(setPreservedSearchMode).toHaveBeenLastCalledWith(
      expect.objectContaining({
        showOperatorSelector: true,
        filterSearch: expect.objectContaining({ field: 'stock' }),
      })
    );
  });

  it('handles multi-column selection when second operator has no value', () => {
    isOperatorCompatibleWithColumnMock.mockReturnValue(true);

    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'AND',
      filterSearch: {
        field: 'stock',
        value: '10',
        valueTo: '20',
        operator: 'inRange',
        column: stockColumn,
        isExplicitOperator: true,
      },
    };

    const preservedRef = {
      current: {
        conditions: [
          { field: 'stock', operator: 'inRange', value: '10', valueTo: '20' },
          { field: 'code', operator: 'equals', value: '' },
        ],
        joins: ['AND'],
        isMultiColumn: true,
      },
    } as RefObject<PreservedFilter | null>;

    const onChange = vi.fn();
    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleColumnSelectMultiColumn(
      codeColumn,
      searchMode,
      preservedRef,
      null,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #inRange 10 #to 20 #and #code #equals ',
      onChange,
      inputRef
    );
    expect(preservedRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenCalledWith(null);
  });

  it('handles multi-column selection when second operator is not preserved yet', () => {
    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'OR',
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: nameColumn,
        isExplicitOperator: true,
      },
    };

    const preservedRef = {
      current: {
        conditions: [{ field: 'name', operator: 'contains', value: 'aspirin' }],
        joins: ['OR'],
      },
    } as RefObject<PreservedFilter | null>;

    const preservedSearchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: nameColumn,
        isExplicitOperator: true,
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'equals', value: '' },
        ],
      },
    };

    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleColumnSelectMultiColumn(
      stockColumn,
      searchMode,
      preservedRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #or #stock #',
      onChange,
      inputRef
    );
    expect(setIsEditingSecondOperator).toHaveBeenCalledWith(true);
    expect(setPreservedSearchMode).toHaveBeenCalledWith(
      expect.objectContaining({ showOperatorSelector: true })
    );
  });

  it('handles preserved filter branches for join-only, no-join inRange, and incompatible reset', () => {
    const onChange = vi.fn();
    const setPreservedSearchMode = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    isOperatorCompatibleWithColumnMock.mockReturnValue(true);
    const joinOnlyRef = {
      current: {
        conditions: [{ field: 'name', operator: 'contains', value: 'aspirin' }],
        joins: ['AND'],
      },
    } as RefObject<PreservedFilter | null>;

    handleColumnSelectWithPreservedFilter(
      stockColumn,
      joinOnlyRef,
      null,
      setPreservedSearchMode,
      [nameColumn, stockColumn],
      onChange,
      inputRef
    );
    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #contains aspirin #and #',
      onChange,
      inputRef
    );

    const noJoinBetweenRef = {
      current: {
        conditions: [
          { field: 'stock', operator: 'inRange', value: '5', valueTo: '10' },
        ],
      },
    } as RefObject<PreservedFilter | null>;
    handleColumnSelectWithPreservedFilter(
      stockColumn,
      noJoinBetweenRef,
      null,
      setPreservedSearchMode,
      [nameColumn, stockColumn],
      onChange,
      inputRef
    );
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#stock #inRange 5 10##',
      onChange,
      inputRef
    );

    isOperatorCompatibleWithColumnMock.mockReturnValue(false);
    const incompatibleSimpleRef = {
      current: {
        conditions: [{ field: 'name', operator: 'greaterThan', value: '12' }],
      },
    } as RefObject<PreservedFilter | null>;

    handleColumnSelectWithPreservedFilter(
      nameColumn,
      incompatibleSimpleRef,
      null,
      setPreservedSearchMode,
      [nameColumn, stockColumn],
      onChange,
      inputRef
    );
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#name #',
      onChange,
      inputRef
    );
    expect(incompatibleSimpleRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenLastCalledWith(null);
  });
});
