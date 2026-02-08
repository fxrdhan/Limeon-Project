import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type {
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from '../types';
import type { PreservedFilter } from '../utils/handlerHelpers';

const getActiveConditionIndexMock = vi.hoisted(() => vi.fn());
const handleColumnSelectMultiColumnMock = vi.hoisted(() => vi.fn());
const handleColumnSelectWithPreservedFilterMock = vi.hoisted(() => vi.fn());
const handleOperatorSelectEditFirstMock = vi.hoisted(() => vi.fn());
const handleOperatorSelectEditSecondMock = vi.hoisted(() => vi.fn());
const handleOperatorSelectNormalMock = vi.hoisted(() => vi.fn());
const handleOperatorSelectSecondMock = vi.hoisted(() => vi.fn());
const isBuildingConditionNMock = vi.hoisted(() => vi.fn());

const extractMultiConditionPreservationMock = vi.hoisted(() => vi.fn());
const setFilterValueMock = vi.hoisted(() => vi.fn());
const isOperatorCompatibleWithColumnMock = vi.hoisted(() => vi.fn());

const patternBuilderBuildNConditionsMock = vi.hoisted(() => vi.fn());
const patternBuilderColumnWithOperatorSelectorMock = vi.hoisted(() => vi.fn());
const patternBuilderPartialMultiMock = vi.hoisted(() => vi.fn());

vi.mock('./selection', () => ({
  getActiveConditionIndex: getActiveConditionIndexMock,
  handleColumnSelectMultiColumn: handleColumnSelectMultiColumnMock,
  handleColumnSelectWithPreservedFilter:
    handleColumnSelectWithPreservedFilterMock,
  handleOperatorSelectEditFirst: handleOperatorSelectEditFirstMock,
  handleOperatorSelectEditSecond: handleOperatorSelectEditSecondMock,
  handleOperatorSelectNormal: handleOperatorSelectNormalMock,
  handleOperatorSelectSecond: handleOperatorSelectSecondMock,
  isBuildingConditionN: isBuildingConditionNMock,
}));

vi.mock('../utils/handlerHelpers', async () => {
  const actual = await vi.importActual<
    typeof import('../utils/handlerHelpers')
  >('../utils/handlerHelpers');
  return {
    ...actual,
    extractMultiConditionPreservation: extractMultiConditionPreservationMock,
    setFilterValue: setFilterValueMock,
  };
});

vi.mock('../utils/operatorUtils', () => ({
  isOperatorCompatibleWithColumn: isOperatorCompatibleWithColumnMock,
}));

vi.mock('../utils/PatternBuilder', () => ({
  PatternBuilder: {
    buildNConditions: patternBuilderBuildNConditionsMock,
    columnWithOperatorSelector: patternBuilderColumnWithOperatorSelectorMock,
    partialMulti: patternBuilderPartialMultiMock,
  },
}));

import { useSelectionHandlers } from './useSelectionHandlers';

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

const makeOperator = (value: string): FilterOperator => ({
  value,
  label: value,
  description: value,
  icon: null,
});

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

type Props = Parameters<typeof useSelectionHandlers>[0];

const buildProps = (partial: Partial<Props> = {}): Props => ({
  value: '#name',
  onChange: vi.fn(),
  inputRef: {
    current: {
      focus: vi.fn(),
    },
  } as unknown as RefObject<HTMLInputElement | null>,
  searchMode: baseSearchMode(),
  preservedSearchMode: null,
  setPreservedSearchMode: vi.fn(),
  preservedFilterRef: {
    current: null,
  } as RefObject<PreservedFilter | null>,
  memoizedColumns: [nameColumn, stockColumn],
  editingSelectorTarget: null,
  isEditingSecondOperator: false,
  setIsEditingSecondOperator: vi.fn(),
  setEditingBadge: vi.fn(),
  ...partial,
});

describe('useSelectionHandlers', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    getActiveConditionIndexMock.mockReset();
    handleColumnSelectMultiColumnMock.mockReset();
    handleColumnSelectWithPreservedFilterMock.mockReset();
    handleOperatorSelectEditFirstMock.mockReset();
    handleOperatorSelectEditSecondMock.mockReset();
    handleOperatorSelectNormalMock.mockReset();
    handleOperatorSelectSecondMock.mockReset();
    isBuildingConditionNMock.mockReset();

    extractMultiConditionPreservationMock.mockReset();
    setFilterValueMock.mockReset();
    isOperatorCompatibleWithColumnMock.mockReset();

    patternBuilderBuildNConditionsMock.mockReset();
    patternBuilderColumnWithOperatorSelectorMock.mockReset();
    patternBuilderPartialMultiMock.mockReset();

    getActiveConditionIndexMock.mockReturnValue(0);
    isBuildingConditionNMock.mockReturnValue(false);
    patternBuilderColumnWithOperatorSelectorMock.mockReturnValue('#name #');
    patternBuilderBuildNConditionsMock.mockReturnValue('pattern');
    patternBuilderPartialMultiMock.mockReturnValue('partial-multi');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles CASE 0-EDIT column select with compatible operator and value', () => {
    getActiveConditionIndexMock.mockReturnValue(2);
    isOperatorCompatibleWithColumnMock.mockReturnValue(true);
    patternBuilderBuildNConditionsMock.mockReturnValue('confirmed-pattern');

    const preservedFilterRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'name', operator: 'equals', value: 'ibu' },
          { field: 'old', operator: 'greaterThan', value: '10' },
        ],
        joins: ['AND', 'OR'],
      },
    } as RefObject<PreservedFilter | null>;

    const props = buildProps({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
      preservedFilterRef,
    });

    const { result } = renderHook(() => useSelectionHandlers(props));
    result.current.handleColumnSelect(stockColumn);

    expect(patternBuilderBuildNConditionsMock).toHaveBeenCalled();
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'confirmed-pattern',
      props.onChange,
      props.inputRef
    );
    expect(props.setPreservedSearchMode).toHaveBeenCalledWith(null);
    expect(preservedFilterRef.current).toBeNull();

    vi.runAllTimers();
    expect(props.inputRef?.current?.focus).toHaveBeenCalled();
  });

  it('handles CASE 0-EDIT column select with incompatible operator', () => {
    getActiveConditionIndexMock.mockReturnValue(2);
    isOperatorCompatibleWithColumnMock.mockReturnValue(false);
    patternBuilderBuildNConditionsMock.mockReturnValue('base-pattern');

    const preservedFilterRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'name', operator: 'equals', value: 'ibu' },
          { field: 'old', operator: 'greaterThan', value: '' },
        ],
        joins: ['AND', 'OR'],
      },
    } as RefObject<PreservedFilter | null>;

    const props = buildProps({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
      preservedFilterRef,
    });

    const { result } = renderHook(() => useSelectionHandlers(props));
    result.current.handleColumnSelect(stockColumn);

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'base-pattern #or #stock #',
      props.onChange,
      props.inputRef
    );
    expect(preservedFilterRef.current?.conditions?.[2]?.field).toBe('stock');
  });

  it('handles CASE 0a and CASE 0b column selection flows', () => {
    getActiveConditionIndexMock.mockReturnValue(2);
    patternBuilderBuildNConditionsMock.mockReturnValue('existing-base');

    const propsCase0a = buildProps({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        partialJoin: 'OR',
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiCondition: true,
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'name', operator: 'equals', value: 'ibu' },
          ],
          joins: ['AND'],
        },
      }),
    });

    const { result: result0a } = renderHook(() =>
      useSelectionHandlers(propsCase0a)
    );
    result0a.current.handleColumnSelect(stockColumn);

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'existing-base #or #stock #',
      propsCase0a.onChange,
      propsCase0a.inputRef
    );
    expect(propsCase0a.setPreservedSearchMode).toHaveBeenCalledWith(null);
    expect(propsCase0a.setIsEditingSecondOperator).toHaveBeenCalledWith(false);

    getActiveConditionIndexMock.mockReturnValue(1);
    isBuildingConditionNMock.mockReturnValue(true);

    const propsCase0b = buildProps({
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: result0b } = renderHook(() =>
      useSelectionHandlers(propsCase0b)
    );
    result0b.current.handleColumnSelect(stockColumn);

    expect(handleColumnSelectMultiColumnMock).toHaveBeenCalled();
  });

  it('handles CASE 1 and CASE 2 column selection flows', () => {
    const preservedFilterRef = {
      current: {
        conditions: [{ field: 'name', operator: 'contains', value: 'asp' }],
        joins: [],
      },
    } as RefObject<PreservedFilter | null>;

    const propsCase1 = buildProps({ preservedFilterRef });
    const { result: result1 } = renderHook(() =>
      useSelectionHandlers(propsCase1)
    );

    result1.current.handleColumnSelect(stockColumn);
    expect(handleColumnSelectWithPreservedFilterMock).toHaveBeenCalled();

    const propsCase2 = buildProps();
    const { result: result2 } = renderHook(() =>
      useSelectionHandlers(propsCase2)
    );

    patternBuilderColumnWithOperatorSelectorMock.mockReturnValue('#stock #');
    result2.current.handleColumnSelect(stockColumn);

    expect(patternBuilderColumnWithOperatorSelectorMock).toHaveBeenCalledWith(
      'stock'
    );
    expect(propsCase2.setPreservedSearchMode).toHaveBeenCalledWith(null);
    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #',
      propsCase2.onChange,
      propsCase2.inputRef
    );
  });

  it('returns early on operator select when no column pattern exists', () => {
    const props = buildProps({ value: 'plain-search' });
    const { result } = renderHook(() => useSelectionHandlers(props));

    result.current.handleOperatorSelect(makeOperator('equals'));

    expect(handleOperatorSelectEditSecondMock).not.toHaveBeenCalled();
    expect(handleOperatorSelectEditFirstMock).not.toHaveBeenCalled();
    expect(handleOperatorSelectSecondMock).not.toHaveBeenCalled();
    expect(handleOperatorSelectNormalMock).not.toHaveBeenCalled();
  });

  it('handles CASE 1 and CASE 2 operator edit flows', () => {
    const propsCase1 = buildProps({
      isEditingSecondOperator: true,
      preservedFilterRef: {
        current: {
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'name', operator: 'equals', value: 'ibu' },
          ],
          joins: ['AND'],
        },
      } as RefObject<PreservedFilter | null>,
    });

    const { result: result1 } = renderHook(() =>
      useSelectionHandlers(propsCase1)
    );
    result1.current.handleOperatorSelect(makeOperator('equals'));
    expect(handleOperatorSelectEditSecondMock).toHaveBeenCalled();

    const propsCase2 = buildProps({
      preservedFilterRef: {
        current: {
          conditions: [{ field: 'name', operator: 'contains', value: 'asp' }],
          joins: [],
        },
      } as RefObject<PreservedFilter | null>,
    });

    isBuildingConditionNMock.mockReturnValue(false);

    const { result: result2 } = renderHook(() =>
      useSelectionHandlers(propsCase2)
    );
    result2.current.handleOperatorSelect(makeOperator('equals'));
    expect(handleOperatorSelectEditFirstMock).toHaveBeenCalled();
  });

  it('handles CASE 2b, CASE 3a, CASE 3b, and CASE 4 operator flows', () => {
    getActiveConditionIndexMock.mockReturnValue(2);
    isBuildingConditionNMock.mockReturnValue(true);
    patternBuilderBuildNConditionsMock.mockReturnValue('updated-n');

    const propsCase2b = buildProps({
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
      preservedFilterRef: {
        current: {
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'name', operator: 'equals', value: 'ibu' },
            { field: 'stock', operator: 'greaterThan', value: '10' },
          ],
          joins: ['AND', 'OR'],
          isMultiColumn: true,
        },
      } as RefObject<PreservedFilter | null>,
    });

    const { result: result2b } = renderHook(() =>
      useSelectionHandlers(propsCase2b)
    );
    result2b.current.handleOperatorSelect(makeOperator('lessThan'));

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'updated-n',
      propsCase2b.onChange,
      propsCase2b.inputRef
    );
    expect(propsCase2b.setPreservedSearchMode).toHaveBeenCalledWith(null);

    getActiveConditionIndexMock.mockReturnValue(2);
    patternBuilderBuildNConditionsMock.mockReturnValue('base-n');

    const propsCase3a = buildProps({
      value: '#name #contains asp #and #stock #',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
        partialJoin: 'AND',
        partialConditions: [
          {
            field: 'name',
            column: nameColumn,
            operator: 'contains',
            value: 'asp',
          },
          {
            field: 'name',
            column: nameColumn,
            operator: 'equals',
            value: 'ibu',
          },
          { field: 'stock', column: stockColumn },
        ],
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiCondition: true,
          conditions: [
            {
              field: 'name',
              operator: 'contains',
              value: 'asp',
              column: nameColumn,
            },
            {
              field: 'name',
              operator: 'equals',
              value: 'ibu',
              column: nameColumn,
            },
          ],
          joins: ['AND'],
        },
      }),
    });

    const { result: result3a } = renderHook(() =>
      useSelectionHandlers(propsCase3a)
    );
    result3a.current.handleOperatorSelect(makeOperator('greaterThan'));

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'base-n #and #stock #greaterThan ',
      propsCase3a.onChange,
      propsCase3a.inputRef
    );

    getActiveConditionIndexMock.mockReturnValue(1);
    isBuildingConditionNMock.mockReturnValue(true);

    const propsCase3b = buildProps({
      searchMode: baseSearchMode({
        partialJoin: 'OR',
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: result3b } = renderHook(() =>
      useSelectionHandlers(propsCase3b)
    );
    result3b.current.handleOperatorSelect(makeOperator('equals'));
    expect(handleOperatorSelectSecondMock).toHaveBeenCalled();

    getActiveConditionIndexMock.mockReturnValue(0);
    isBuildingConditionNMock.mockReturnValue(false);

    const propsCase4 = buildProps();
    const { result: result4 } = renderHook(() =>
      useSelectionHandlers(propsCase4)
    );
    result4.current.handleOperatorSelect(makeOperator('contains'));
    expect(handleOperatorSelectNormalMock).toHaveBeenCalled();
  });

  it('handles CASE 1 join editing with complete and incomplete conditions', () => {
    patternBuilderBuildNConditionsMock.mockReturnValue('join-pattern');

    const completeProps = buildProps({
      editingSelectorTarget: { conditionIndex: 0, target: 'join' },
      preservedFilterRef: {
        current: {
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'name', operator: 'equals', value: 'ibu' },
          ],
          joins: ['AND'],
          isMultiColumn: false,
        },
      } as RefObject<PreservedFilter | null>,
    });

    const { result: completeResult } = renderHook(() =>
      useSelectionHandlers(completeProps)
    );

    completeResult.current.handleJoinOperatorSelect({
      value: 'or',
      label: 'OR',
      description: 'or',
      icon: null,
      activeColor: 'x',
    });

    expect(patternBuilderBuildNConditionsMock).toHaveBeenCalledWith(
      expect.any(Array),
      ['OR'],
      false,
      'name',
      { confirmed: true }
    );
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'join-pattern',
      completeProps.onChange,
      completeProps.inputRef
    );

    const incompleteProps = buildProps({
      preservedFilterRef: {
        current: {
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'name', operator: 'equals', value: '' },
          ],
          joins: ['AND'],
          isMultiColumn: false,
        },
      } as RefObject<PreservedFilter | null>,
    });

    const { result: incompleteResult } = renderHook(() =>
      useSelectionHandlers(incompleteProps)
    );

    incompleteResult.current.handleJoinOperatorSelect({
      value: 'and',
      label: 'AND',
      description: 'and',
      icon: null,
      activeColor: 'x',
    });

    expect(patternBuilderBuildNConditionsMock).toHaveBeenLastCalledWith(
      expect.any(Array),
      ['AND'],
      false,
      'name',
      { confirmed: false }
    );
  });

  it('handles CASE 2 join selection from confirmed filters and non-confirmed early return', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'name', operator: 'equals', value: 'ibu' },
      ],
      joins: ['AND'],
      isMultiColumn: false,
    });

    patternBuilderBuildNConditionsMock.mockReturnValue('base-join');

    const confirmedMultiProps = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          conditions: [
            {
              field: 'name',
              operator: 'contains',
              value: 'asp',
              column: nameColumn,
            },
            {
              field: 'name',
              operator: 'equals',
              value: 'ibu',
              column: nameColumn,
            },
          ],
          joins: ['AND'],
        },
      }),
    });

    const { result: confirmedMultiResult } = renderHook(() =>
      useSelectionHandlers(confirmedMultiProps)
    );

    confirmedMultiResult.current.handleJoinOperatorSelect({
      value: 'or',
      label: 'OR',
      description: 'or',
      icon: null,
      activeColor: 'x',
    });

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'base-join #or #',
      confirmedMultiProps.onChange,
      confirmedMultiProps.inputRef
    );

    const confirmedValueToProps = buildProps({
      searchMode: baseSearchMode({
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

    const { result: confirmedValueToResult } = renderHook(() =>
      useSelectionHandlers(confirmedValueToProps)
    );

    confirmedValueToResult.current.handleJoinOperatorSelect({
      value: 'and',
      label: 'AND',
      description: 'and',
      icon: null,
      activeColor: 'x',
    });

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #inRange 10 #to 20 #and #',
      confirmedValueToProps.onChange,
      confirmedValueToProps.inputRef
    );

    const nonConfirmedProps = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: false,
        },
      }),
    });

    const callsBefore = setFilterValueMock.mock.calls.length;
    const { result: nonConfirmedResult } = renderHook(() =>
      useSelectionHandlers(nonConfirmedProps)
    );

    nonConfirmedResult.current.handleJoinOperatorSelect({
      value: 'or',
      label: 'OR',
      description: 'or',
      icon: null,
      activeColor: 'x',
    });

    expect(setFilterValueMock.mock.calls.length).toBe(callsBefore);
  });
});
