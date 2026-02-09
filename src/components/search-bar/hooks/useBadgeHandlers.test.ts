import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { MutableRefObject, RefObject } from 'react';
import type { EnhancedSearchState, SearchColumn } from '../types';
import type { PreservedFilter } from '../utils/handlerHelpers';

const extractMultiConditionPreservationMock = vi.hoisted(() => vi.fn());
const getConditionAtMock = vi.hoisted(() => vi.fn());
const setFilterValueMock = vi.hoisted(() => vi.fn());
const restoreConfirmedPatternMock = vi.hoisted(() => vi.fn());

const patternBuilderBuildNConditionsMock = vi.hoisted(() => vi.fn());
const patternBuilderColumnMock = vi.hoisted(() => vi.fn());
const patternBuilderColumnWithOperatorSelectorMock = vi.hoisted(() => vi.fn());
const patternBuilderWithJoinSelectorAtIndexMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/handlerHelpers', async () => {
  const actual = await vi.importActual<
    typeof import('../utils/handlerHelpers')
  >('../utils/handlerHelpers');

  return {
    ...actual,
    extractMultiConditionPreservation: extractMultiConditionPreservationMock,
    getConditionAt: getConditionAtMock,
    setFilterValue: setFilterValueMock,
  };
});

vi.mock('../utils/patternRestoration', () => ({
  restoreConfirmedPattern: restoreConfirmedPatternMock,
}));

vi.mock('../utils/PatternBuilder', () => ({
  PatternBuilder: {
    buildNConditions: patternBuilderBuildNConditionsMock,
    column: patternBuilderColumnMock,
    columnWithOperatorSelector: patternBuilderColumnWithOperatorSelectorMock,
    withJoinSelectorAtIndex: patternBuilderWithJoinSelectorAtIndexMock,
  },
}));

import { useBadgeHandlers } from './useBadgeHandlers';

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

type Props = Parameters<typeof useBadgeHandlers>[0];

const buildProps = (partial: Partial<Props> = {}): Props => ({
  value: '#name #contains aspirin##',
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
  } as MutableRefObject<PreservedFilter | null>,
  onClearPreservedState: vi.fn(),
  onClearSearch: vi.fn(),
  setEditingSelectorTarget: vi.fn(),
  setEditingBadge: vi.fn(),
  setCurrentJoinOperator: vi.fn(),
  ...partial,
});

describe('useBadgeHandlers', () => {
  beforeEach(() => {
    extractMultiConditionPreservationMock.mockReset();
    getConditionAtMock.mockReset();
    setFilterValueMock.mockReset();
    restoreConfirmedPatternMock.mockReset();

    patternBuilderBuildNConditionsMock.mockReset();
    patternBuilderColumnMock.mockReset();
    patternBuilderColumnWithOperatorSelectorMock.mockReset();
    patternBuilderWithJoinSelectorAtIndexMock.mockReset();

    patternBuilderBuildNConditionsMock.mockReturnValue('pattern');
    patternBuilderColumnMock.mockReturnValue('#');
    patternBuilderColumnWithOperatorSelectorMock.mockReturnValue('#name #');
    patternBuilderWithJoinSelectorAtIndexMock.mockReturnValue('join-selector');
    restoreConfirmedPatternMock.mockReturnValue('#name #contains aspirin##');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clearAll uses onClearSearch when provided and falls back to onChange', () => {
    const propsWithClear = buildProps();
    const { result: withClear } = renderHook(() =>
      useBadgeHandlers(propsWithClear)
    );

    withClear.current.clearAll();
    expect(propsWithClear.onClearPreservedState).toHaveBeenCalled();
    expect(propsWithClear.onClearSearch).toHaveBeenCalled();

    const onChange = vi.fn();
    const propsWithoutClear = buildProps({
      onClearSearch: undefined,
      onChange,
    });
    const { result: withoutClear } = renderHook(() =>
      useBadgeHandlers(propsWithoutClear)
    );

    withoutClear.current.clearAll();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '' } })
    );
  });

  it('clearConditionPart handles no preservation and column target variants', () => {
    extractMultiConditionPreservationMock.mockReturnValueOnce(null);

    const propsNoPreservation = buildProps();
    const { result: noPreservation } = renderHook(() =>
      useBadgeHandlers(propsNoPreservation)
    );

    noPreservation.current.clearConditionPart(1, 'column');
    expect(propsNoPreservation.onClearSearch).toHaveBeenCalled();

    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'name', operator: 'equals', value: 'ibu' },
      ],
      joins: ['AND'],
      isMultiColumn: false,
    });
    patternBuilderBuildNConditionsMock.mockReturnValue('base-column');

    const propsColumn = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: columnResult } = renderHook(() =>
      useBadgeHandlers(propsColumn)
    );

    columnResult.current.clearConditionPart(1, 'column');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'base-column #and #',
      propsColumn.onChange,
      propsColumn.inputRef
    );

    columnResult.current.clearConditionPart(0, 'column');
    expect(propsColumn.onClearSearch).toHaveBeenCalled();
  });

  it('clearConditionPart handles operator target for partial and existing conditions', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [{ field: 'name', operator: 'contains', value: 'asp' }],
      joins: ['OR'],
      isMultiColumn: false,
    });

    patternBuilderBuildNConditionsMock.mockReturnValue('base-op');

    const propsPartial = buildProps({
      searchMode: baseSearchMode({
        selectedColumn: stockColumn,
        partialConditions: [
          {
            field: 'name',
            column: nameColumn,
            operator: 'contains',
            value: 'asp',
          },
          { field: 'stock', column: stockColumn },
        ],
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: partialResult } = renderHook(() =>
      useBadgeHandlers(propsPartial)
    );

    partialResult.current.clearConditionPart(1, 'operator');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'base-op #or #stock #',
      propsPartial.onChange,
      propsPartial.inputRef
    );

    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'stock', operator: 'greaterThan', value: '10' },
      ],
      joins: ['AND'],
      isMultiColumn: true,
    });
    patternBuilderBuildNConditionsMock.mockReturnValue('operator-reset');

    const propsExisting = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: existingResult } = renderHook(() =>
      useBadgeHandlers(propsExisting)
    );

    existingResult.current.clearConditionPart(1, 'operator');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'operator-reset',
      propsExisting.onChange,
      propsExisting.inputRef
    );
  });

  it('clearConditionPart handles value and valueTo targets', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'stock', operator: 'inRange', value: '10', valueTo: '20' },
      ],
      joins: [],
      isMultiColumn: false,
    });

    const props = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'stock',
          value: '10',
          valueTo: '20',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result } = renderHook(() => useBadgeHandlers(props));

    patternBuilderBuildNConditionsMock.mockReturnValue('value-cleared');
    result.current.clearConditionPart(0, 'value');

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'value-cleared',
      props.onChange,
      props.inputRef,
      { focus: true, cursorAtEnd: true }
    );

    patternBuilderBuildNConditionsMock.mockReturnValue('valueTo-cleared');
    result.current.clearConditionPart(0, 'valueTo');

    expect(setFilterValueMock).toHaveBeenCalledWith(
      'valueTo-cleared #to ',
      props.onChange,
      props.inputRef,
      { focus: true, cursorAtEnd: true }
    );
  });

  it('clearJoin handles no filter and confirmed multi-condition filter', () => {
    const propsNoFilter = buildProps({ searchMode: baseSearchMode() });
    const { result: noFilterResult } = renderHook(() =>
      useBadgeHandlers(propsNoFilter)
    );

    noFilterResult.current.clearJoin(0);
    expect(propsNoFilter.onClearSearch).toHaveBeenCalled();

    patternBuilderBuildNConditionsMock.mockReturnValue('join-open');

    const propsWithFilter = buildProps({
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        joins: ['OR'],
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiCondition: true,
          isMultiColumn: true,
          joinOperator: 'AND',
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'stock', operator: 'greaterThan', value: '10' },
          ],
        },
      }),
    });

    const { result: withFilterResult } = renderHook(() =>
      useBadgeHandlers(propsWithFilter)
    );

    withFilterResult.current.clearJoin(0);
    expect(propsWithFilter.setCurrentJoinOperator).toHaveBeenCalledWith('AND');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'join-open',
      propsWithFilter.onChange,
      propsWithFilter.inputRef
    );
  });

  it('editValueN preserves state, restores confirmed pattern, and sets editing badge', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [{ field: 'name', operator: 'contains', value: 'asp' }],
      joins: [],
      isMultiColumn: false,
    });

    getConditionAtMock.mockReturnValue({
      field: 'name',
      operator: 'contains',
      value: 'aspirin',
      valueTo: 'ibuprofen',
    });

    restoreConfirmedPatternMock.mockReturnValue('#name #contains aspirin##');

    const props = buildProps({
      value: '#name #contains asp',
      searchMode: baseSearchMode({
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

    const { result } = renderHook(() => useBadgeHandlers(props));

    result.current.editValueN(0, 'valueTo');

    expect(props.setPreservedSearchMode).toHaveBeenCalledWith(props.searchMode);
    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin##' },
      })
    );
    expect(props.preservedFilterRef.current).toEqual(
      expect.objectContaining({
        conditions: [
          expect.objectContaining({
            field: 'name',
            operator: 'contains',
            value: 'asp',
          }),
        ],
      })
    );
    expect(props.setEditingBadge).toHaveBeenCalledWith({
      conditionIndex: 0,
      field: 'valueTo',
      value: 'ibuprofen',
    });
  });

  it('editConditionPart handles missing state, column/operator edits, and value delegation', () => {
    const propsNoState = buildProps({ searchMode: baseSearchMode() });
    const { result: noStateResult } = renderHook(() =>
      useBadgeHandlers(propsNoState)
    );

    noStateResult.current.editConditionPart(0, 'column');
    expect(setFilterValueMock).not.toHaveBeenCalled();

    extractMultiConditionPreservationMock.mockReturnValueOnce(null);
    patternBuilderColumnMock.mockReturnValue('#');

    const propsColumn = buildProps({
      searchMode: baseSearchMode({ selectedColumn: nameColumn }),
    });
    const { result: columnResult } = renderHook(() =>
      useBadgeHandlers(propsColumn)
    );

    columnResult.current.editConditionPart(0, 'column');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#',
      propsColumn.onChange,
      propsColumn.inputRef
    );

    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'stock', operator: 'greaterThan', value: '10' },
      ],
      joins: ['AND'],
      isMultiColumn: true,
    });

    patternBuilderBuildNConditionsMock.mockReturnValue('edit-op-base');

    const propsOperator = buildProps({
      searchMode: baseSearchMode({
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
        },
      }),
    });

    const { result: operatorResult } = renderHook(() =>
      useBadgeHandlers(propsOperator)
    );

    operatorResult.current.editConditionPart(1, 'operator');
    expect(propsOperator.setEditingSelectorTarget).toHaveBeenCalledWith({
      conditionIndex: 1,
      target: 'operator',
    });
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'edit-op-base #and #stock #',
      propsOperator.onChange,
      propsOperator.inputRef
    );

    getConditionAtMock.mockReturnValue({
      field: 'name',
      operator: 'contains',
      value: 'asp',
      valueTo: undefined,
    });

    operatorResult.current.editConditionPart(0, 'value');
    expect(propsOperator.setEditingBadge).toHaveBeenCalledWith({
      conditionIndex: 0,
      field: 'value',
      value: 'asp',
    });
  });

  it('editJoin preserves state and opens join selector at index', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'stock', operator: 'greaterThan', value: '10' },
      ],
      joins: ['AND'],
      isMultiColumn: true,
    });

    patternBuilderWithJoinSelectorAtIndexMock.mockReturnValue('open-join');

    const props = buildProps({
      searchMode: baseSearchMode({
        partialJoin: 'OR',
        joins: ['AND', 'OR'],
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiCondition: true,
          joinOperator: 'AND',
          conditions: [
            { field: 'name', operator: 'contains', value: 'asp' },
            { field: 'stock', operator: 'greaterThan', value: '10' },
          ],
        },
      }),
    });

    const { result } = renderHook(() => useBadgeHandlers(props));

    result.current.editJoin(0);

    expect(props.setPreservedSearchMode).toHaveBeenCalledWith(props.searchMode);
    expect(props.setEditingSelectorTarget).toHaveBeenCalledWith({
      conditionIndex: 0,
      target: 'join',
    });
    expect(props.setCurrentJoinOperator).toHaveBeenCalledWith('AND');
    expect(patternBuilderWithJoinSelectorAtIndexMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      false,
      'name',
      0
    );
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'open-join',
      props.onChange,
      props.inputRef
    );
  });

  it('handles operator clear fallback paths and ignores invalid value/valueTo indexes', () => {
    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [],
      joins: [],
      isMultiColumn: false,
    });

    const props = buildProps({
      searchMode: baseSearchMode({
        partialConditions: [],
      }),
    });

    const { result } = renderHook(() => useBadgeHandlers(props));

    result.current.clearConditionPart(0, 'operator');
    expect(props.onClearSearch).toHaveBeenCalledTimes(1);

    result.current.clearConditionPart(3, 'value');
    result.current.clearConditionPart(3, 'valueTo');
    expect(setFilterValueMock).toHaveBeenCalledTimes(0);
  });

  it('handles single-condition join clear/edit with partial conditions and join fallbacks', () => {
    patternBuilderBuildNConditionsMock.mockReturnValue('single-join-open');
    patternBuilderWithJoinSelectorAtIndexMock.mockReturnValue(
      'single-edit-join'
    );

    const props = buildProps({
      searchMode: baseSearchMode({
        partialJoin: 'OR',
        joins: ['AND'],
        partialConditions: [
          {
            field: 'name',
            column: nameColumn,
            operator: 'contains',
            value: 'asp',
          },
          {
            field: 'stock',
            column: stockColumn,
            operator: 'greaterThan',
            value: '10',
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    const { result } = renderHook(() => useBadgeHandlers(props));

    result.current.clearJoin(0);
    expect(props.setCurrentJoinOperator).toHaveBeenCalledWith('OR');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'single-join-open',
      props.onChange,
      props.inputRef
    );

    result.current.editJoin(0);
    expect(patternBuilderWithJoinSelectorAtIndexMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      false,
      'name',
      0
    );
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      'single-edit-join',
      props.onChange,
      props.inputRef
    );
  });

  it('covers edit fallbacks for missing filter state and selector pattern builders', () => {
    const propsNoFilter = buildProps({ searchMode: baseSearchMode() });
    const { result: noFilterResult } = renderHook(() =>
      useBadgeHandlers(propsNoFilter)
    );

    noFilterResult.current.editValueN(0, 'value');
    noFilterResult.current.editJoin(0);
    expect(setFilterValueMock).not.toHaveBeenCalled();

    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [
        { field: 'name', operator: 'contains', value: 'asp' },
        { field: 'stock', operator: 'greaterThan', value: '10' },
      ],
      joins: ['AND'],
      isMultiColumn: true,
    });
    patternBuilderBuildNConditionsMock.mockReturnValue('edit-column-base');
    patternBuilderColumnWithOperatorSelectorMock.mockReturnValue('#name #');

    const propsWithFilter = buildProps({
      searchMode: baseSearchMode({
        selectedColumn: nameColumn,
        filterSearch: {
          field: 'name',
          value: 'asp',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    const { result: withFilterResult } = renderHook(() =>
      useBadgeHandlers(propsWithFilter)
    );

    withFilterResult.current.editConditionPart(1, 'column');
    expect(setFilterValueMock).toHaveBeenCalledWith(
      'edit-column-base #and #',
      propsWithFilter.onChange,
      propsWithFilter.inputRef
    );

    extractMultiConditionPreservationMock.mockReturnValueOnce(null);
    withFilterResult.current.editConditionPart(0, 'operator');
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#name #',
      propsWithFilter.onChange,
      propsWithFilter.inputRef
    );

    extractMultiConditionPreservationMock.mockReturnValue({
      conditions: [{ field: 'name', operator: 'contains', value: 'asp' }],
      joins: [],
      isMultiColumn: false,
    });
    withFilterResult.current.editConditionPart(0, 'operator');
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#name #',
      propsWithFilter.onChange,
      propsWithFilter.inputRef
    );
  });
});
