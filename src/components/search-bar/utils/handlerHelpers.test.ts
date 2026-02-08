import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState, FilterSearch, SearchColumn } from '../types';
import {
  extractMultiConditionPreservation,
  getConditionAt,
  getConditionOperatorAt,
  getFirstCondition,
  getJoinAt,
  getJoinOperator,
  setFilterValue,
} from './handlerHelpers';

const textColumn: SearchColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text',
};

describe('handlerHelpers', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sets filter value and focuses at cursor end when requested', () => {
    const onChange = vi.fn();
    const input = document.createElement('input');
    const focusSpy = vi.spyOn(input, 'focus');
    const selectionSpy = vi.spyOn(input, 'setSelectionRange');

    setFilterValue(
      'hello',
      onChange,
      { current: input },
      {
        focus: true,
        cursorAtEnd: true,
      }
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: 'hello' } })
    );
    expect(focusSpy).toHaveBeenCalled();
    expect(selectionSpy).toHaveBeenCalledWith(5, 5);
  });

  it('sets filter value without focusing when disabled', () => {
    const onChange = vi.fn();
    const input = document.createElement('input');
    const focusSpy = vi.spyOn(input, 'focus');

    setFilterValue('abc', onChange, { current: input }, { focus: false });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('handles missing input ref safely', () => {
    const onChange = vi.fn();

    expect(() => {
      setFilterValue('abc', onChange, { current: null }, { focus: true });
      setFilterValue('xyz', onChange, undefined, { focus: true });
    }).not.toThrow();
  });

  it('extracts confirmed multi-condition preservation with partial additions', () => {
    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'OR',
      joins: ['OR', 'AND'],
      partialConditions: [
        { field: 'name', operator: 'contains', value: 'aspirin' },
        { field: 'name', operator: 'equals', value: 'ibuprofen' },
        { field: 'stock', operator: 'greaterThan', value: '10' },
      ],
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        column: textColumn,
        operator: 'contains',
        isExplicitOperator: true,
        isMultiCondition: true,
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'name', operator: 'equals', value: 'ibuprofen' },
        ],
        joins: ['OR'],
        isMultiColumn: false,
      },
    };

    const result = extractMultiConditionPreservation(searchMode);

    expect(result).toEqual({
      conditions: [
        {
          field: 'name',
          operator: 'contains',
          value: 'aspirin',
          valueTo: undefined,
        },
        {
          field: 'name',
          operator: 'equals',
          value: 'ibuprofen',
          valueTo: undefined,
        },
        {
          field: 'stock',
          operator: 'greaterThan',
          value: '10',
          valueTo: undefined,
        },
      ],
      joins: ['OR', 'AND'],
      isMultiColumn: true,
    });
  });

  it('extracts preservation from partial join state', () => {
    const searchMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'AND',
      joins: ['AND'],
      partialConditions: [
        { field: 'name', operator: 'contains', value: 'aspirin' },
        { field: 'code', operator: 'equals', value: 'A-1' },
      ],
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        column: textColumn,
        operator: 'contains',
        isExplicitOperator: true,
      },
    };

    const result = extractMultiConditionPreservation(searchMode);

    expect(result).toEqual({
      conditions: [
        {
          field: 'name',
          operator: 'contains',
          value: 'aspirin',
          valueTo: undefined,
        },
        {
          field: 'code',
          operator: 'equals',
          value: 'A-1',
          valueTo: undefined,
        },
      ],
      joins: ['AND'],
      isMultiColumn: false,
    });
  });

  it('returns single-condition preservation and null fallback', () => {
    const singleMode: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        column: textColumn,
        operator: 'contains',
        isExplicitOperator: true,
      },
    };

    expect(extractMultiConditionPreservation(singleMode)).toEqual({
      conditions: [
        {
          field: 'name',
          operator: 'contains',
          value: 'aspirin',
          valueTo: undefined,
        },
      ],
      joins: [],
      isMultiColumn: false,
    });

    const noFilter: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    };

    expect(extractMultiConditionPreservation(noFilter)).toBeNull();

    const noOperator: EnhancedSearchState = {
      ...singleMode,
      filterSearch: {
        ...(singleMode.filterSearch as FilterSearch),
        operator: '',
      },
    };
    expect(extractMultiConditionPreservation(noOperator)).toBeNull();
  });

  it('gets condition data from confirmed, fallback, and partial state', () => {
    const filter: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      isMultiCondition: true,
      conditions: [
        { field: 'name', operator: 'contains', value: 'aspirin' },
        { field: 'name', operator: 'equals', value: 'ibuprofen' },
      ],
      joinOperator: 'OR',
    };

    expect(getFirstCondition(filter)).toEqual({
      field: 'name',
      operator: 'contains',
      value: 'aspirin',
      valueTo: undefined,
    });

    expect(getConditionAt(filter, undefined, 1)).toEqual({
      field: 'name',
      operator: 'equals',
      value: 'ibuprofen',
      valueTo: undefined,
    });

    const partialState: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialConditions: [
        { field: 'name', operator: 'contains', value: 'aspirin' },
        { field: 'code', operator: 'startsWith', value: 'A' },
      ],
    };

    expect(
      getConditionAt(
        {
          field: 'name',
          value: 'aspirin',
          column: textColumn,
          operator: 'contains',
          isExplicitOperator: true,
        },
        partialState,
        1
      )
    ).toEqual({
      field: 'code',
      operator: 'startsWith',
      value: 'A',
      valueTo: undefined,
    });

    expect(getConditionAt(filter, partialState, 9)).toBeUndefined();
  });

  it('gets join operators with precedence and operator fallback parsing', () => {
    const filter: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      joinOperator: 'AND',
    };

    const stateWithJoins: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      joins: ['OR'],
      partialJoin: 'AND',
    };

    expect(getJoinAt(filter, stateWithJoins, 0)).toBe('OR');
    expect(getJoinOperator(filter, stateWithJoins)).toBe('OR');

    const stateWithoutJoins: EnhancedSearchState = {
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      partialJoin: 'OR',
    };

    expect(getJoinAt(filter, stateWithoutJoins, 0)).toBe('AND');
    expect(getJoinAt(filter, undefined, 1)).toBeUndefined();

    expect(
      getConditionOperatorAt(
        filter,
        undefined,
        1,
        '#name #contains aspirin #and #equals ibuprofen'
      )
    ).toBe('equals');

    expect(
      getConditionOperatorAt(filter, undefined, 2, '#name #contains aspirin')
    ).toBeUndefined();
  });
});
