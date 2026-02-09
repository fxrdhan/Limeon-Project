import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState, FilterOperator } from '../../types';
import type { PreservedFilter } from '../../utils/handlerHelpers';

const setFilterValueMock = vi.hoisted(() => vi.fn());
const getColumnAtMock = vi.hoisted(() => vi.fn());
const isBuildingConditionNMock = vi.hoisted(() => vi.fn());

vi.mock('../../utils/handlerHelpers', async () => {
  const actual = await vi.importActual<
    typeof import('../../utils/handlerHelpers')
  >('../../utils/handlerHelpers');
  return {
    ...actual,
    setFilterValue: setFilterValueMock,
  };
});

vi.mock('./useColumnSelection', () => ({
  getColumnAt: getColumnAtMock,
  isBuildingConditionN: isBuildingConditionNMock,
}));

import {
  handleOperatorSelectEditFirst,
  handleOperatorSelectEditSecond,
  handleOperatorSelectNormal,
  handleOperatorSelectSecond,
} from './useOperatorSelection';

const makeOperator = (value: string): FilterOperator => ({
  value,
  label: value,
  description: value,
  icon: null,
});

describe('useOperatorSelection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setFilterValueMock.mockReset();
    getColumnAtMock.mockReset();
    isBuildingConditionNMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles second-operator edit when switching to inRange', () => {
    const preservedRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'equals', value: '10' },
        ],
        joins: ['AND'],
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
        column: {
          field: 'name',
          headerName: 'Name',
          searchable: true,
          type: 'text',
        },
        isExplicitOperator: true,
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'equals', value: '10' },
        ],
      },
    };

    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const setEditingBadge = vi.fn();
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleOperatorSelectEditSecond(
      makeOperator('inRange'),
      'name',
      preservedRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      setEditingBadge,
      onChange,
      inputRef
    );

    expect(setIsEditingSecondOperator).toHaveBeenCalledWith(false);
    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #and #inRange 10##',
      onChange,
      inputRef
    );
    expect(preservedRef.current?.conditions?.[1]?.operator).toBe('inRange');
    expect(setPreservedSearchMode).toHaveBeenCalledWith(
      expect.objectContaining({
        filterSearch: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({ operator: 'contains' }),
            expect.objectContaining({ operator: 'inRange' }),
          ]),
        }),
      })
    );

    vi.runAllTimers();
    expect(setEditingBadge).toHaveBeenCalledWith({
      conditionIndex: 1,
      field: 'value',
      value: '10-',
    });
  });

  it('handles first-operator edit for inRange conversion with immediate badge editing', () => {
    const preservedRef = {
      current: {
        conditions: [{ field: 'name', operator: 'equals', value: '5' }],
        joins: [],
      },
    } as RefObject<PreservedFilter | null>;

    const setPreservedSearchMode = vi.fn();
    const setEditingBadge = vi.fn();
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleOperatorSelectEditFirst(
      makeOperator('inRange'),
      'name',
      preservedRef,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #inRange 5##',
      onChange,
      inputRef
    );

    vi.runAllTimers();
    expect(setEditingBadge).toHaveBeenCalledWith({
      conditionIndex: 0,
      field: 'value',
      value: '5-',
    });
    expect(setPreservedSearchMode).not.toHaveBeenCalled();
  });

  it('handles selecting second operator in multi-column partial state', () => {
    getColumnAtMock.mockReturnValue({ field: 'stock' });
    isBuildingConditionNMock.mockReturnValue(true);

    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'OR',
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        valueTo: 'ibuprofen',
        operator: 'contains',
        column: {
          field: 'name',
          headerName: 'Name',
          searchable: true,
          type: 'text',
        },
        isExplicitOperator: true,
      },
    };

    const onChange = vi.fn();
    const focus = vi.fn();
    const inputRef = {
      current: { focus },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleOperatorSelectSecond(
      makeOperator('equals'),
      searchMode,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #to ibuprofen #or #stock #equals ',
      onChange,
      inputRef
    );

    vi.runAllTimers();
    expect(focus).toHaveBeenCalled();
  });

  it('handles normal operator selection flow', () => {
    const onChange = vi.fn();
    const focus = vi.fn();
    const inputRef = {
      current: { focus },
    } as unknown as RefObject<HTMLInputElement | null>;

    handleOperatorSelectNormal(
      makeOperator('greaterThan'),
      'stock',
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#stock #greaterThan ',
      onChange,
      inputRef
    );

    vi.runAllTimers();
    expect(focus).toHaveBeenCalled();
  });

  it('handles second-operator edit branches for preserved completed and partial values', () => {
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;
    const setPreservedSearchMode = vi.fn();
    const setIsEditingSecondOperator = vi.fn();
    const setEditingBadge = vi.fn();

    const completedSecondRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '20', valueTo: '30' },
        ],
        joins: ['OR'],
        isMultiColumn: true,
      },
    } as RefObject<PreservedFilter | null>;

    handleOperatorSelectEditSecond(
      makeOperator('lessThan'),
      'name',
      completedSecondRef,
      null,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      setEditingBadge,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #or #stock #lessThan 20##',
      onChange,
      inputRef
    );
    expect(completedSecondRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenCalledWith(null);

    const partialSecondRef = {
      current: {
        conditions: [
          { field: 'stock', operator: 'inRange', value: '10', valueTo: '20' },
          { field: 'code', operator: 'equals', value: '' },
        ],
        joins: ['AND'],
        isMultiColumn: true,
      },
    } as RefObject<PreservedFilter | null>;

    handleOperatorSelectEditSecond(
      makeOperator('contains'),
      'stock',
      partialSecondRef,
      null,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
      setEditingBadge,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#stock #inRange 10 #to 20 #and #code #contains ',
      onChange,
      inputRef
    );
    expect(setIsEditingSecondOperator).toHaveBeenCalledWith(false);
  });

  it('handles first-operator edit branches for joins, between-confirmed, and empty value', () => {
    const onChange = vi.fn();
    const inputRef = {
      current: { focus: vi.fn() },
    } as unknown as RefObject<HTMLInputElement | null>;
    const setPreservedSearchMode = vi.fn();
    const setEditingBadge = vi.fn();

    const joinedRef = {
      current: {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '20' },
        ],
        joins: ['AND'],
        isMultiColumn: true,
      },
    } as RefObject<PreservedFilter | null>;

    handleOperatorSelectEditFirst(
      makeOperator('greaterThan'),
      'name',
      joinedRef,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
      inputRef
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #greaterThan aspirin #and #stock #equals 20##',
      onChange,
      inputRef
    );
    expect(joinedRef.current).toBeNull();
    expect(setPreservedSearchMode).toHaveBeenCalledWith(null);

    const betweenRef = {
      current: {
        conditions: [
          { field: 'stock', operator: 'inRange', value: '5', valueTo: '10' },
        ],
      },
    } as RefObject<PreservedFilter | null>;

    handleOperatorSelectEditFirst(
      makeOperator('inRange'),
      'stock',
      betweenRef,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
      inputRef
    );
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#stock #inRange 5 10##',
      onChange,
      inputRef
    );

    const emptyValueRef = {
      current: {
        conditions: [{ field: 'code', operator: 'equals', value: '' }],
      },
    } as RefObject<PreservedFilter | null>;
    handleOperatorSelectEditFirst(
      makeOperator('contains'),
      'code',
      emptyValueRef,
      setPreservedSearchMode,
      setEditingBadge,
      onChange,
      inputRef
    );
    expect(setFilterValueMock).toHaveBeenLastCalledWith(
      '#code #contains ',
      onChange,
      inputRef
    );
  });

  it('handles second-operator selection when not building multi-column and without valueTo', () => {
    getColumnAtMock.mockReturnValue({ field: 'code' });
    isBuildingConditionNMock.mockReturnValue(false);

    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'AND',
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: {
          field: 'name',
          headerName: 'Name',
          searchable: true,
          type: 'text',
        },
        isExplicitOperator: true,
      },
    };

    const onChange = vi.fn();
    handleOperatorSelectSecond(
      makeOperator('equals'),
      searchMode,
      onChange,
      undefined
    );

    expect(setFilterValueMock).toHaveBeenCalledWith(
      '#name #contains aspirin #and #equals ',
      onChange,
      undefined
    );
  });
});
