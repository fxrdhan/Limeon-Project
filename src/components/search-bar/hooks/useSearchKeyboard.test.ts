import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState } from '../types';
import { useSearchKeyboard } from './useSearchKeyboard';

const insertGroupOpenTokenMock = vi.hoisted(() => vi.fn());
const insertGroupCloseTokenMock = vi.hoisted(() => vi.fn());
const removeGroupTokenAtIndexMock = vi.hoisted(() => vi.fn());
const patternBuilderBuildNConditionsMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/groupPatternUtils', () => ({
  insertGroupOpenToken: insertGroupOpenTokenMock,
  insertGroupCloseToken: insertGroupCloseTokenMock,
  removeGroupTokenAtIndex: removeGroupTokenAtIndexMock,
}));

vi.mock('../utils/PatternBuilder', () => ({
  PatternBuilder: {
    buildNConditions: patternBuilderBuildNConditionsMock,
  },
}));

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

type Props = Parameters<typeof useSearchKeyboard>[0];

const buildProps = (partial: Partial<Props> = {}): Props => ({
  value: '',
  searchMode: baseSearchMode(),
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
  onClearSearch: vi.fn(),
  handleCloseColumnSelector: vi.fn(),
  handleCloseOperatorSelector: vi.fn(),
  handleCloseJoinOperatorSelector: vi.fn(),
  onClearPreservedState: vi.fn(),
  onStepBackDelete: vi.fn(() => false),
  onInvalidGroupOpen: vi.fn(),
  editConditionValue: vi.fn(),
  clearConditionPart: vi.fn(),
  clearJoin: vi.fn(),
  ...partial,
});

const makeKeyEvent = (
  key: string,
  currentValue: string = ''
): React.KeyboardEvent<HTMLInputElement> =>
  ({
    key,
    currentTarget: { value: currentValue },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ctrlKey: false,
    metaKey: false,
    altKey: false,
  }) as unknown as React.KeyboardEvent<HTMLInputElement>;

describe('useSearchKeyboard', () => {
  beforeEach(() => {
    insertGroupOpenTokenMock.mockReset();
    insertGroupCloseTokenMock.mockReset();
    removeGroupTokenAtIndexMock.mockReset();
    patternBuilderBuildNConditionsMock.mockReset();

    insertGroupOpenTokenMock.mockReturnValue('#( ');
    insertGroupCloseTokenMock.mockReturnValue('#)');
    removeGroupTokenAtIndexMock.mockReturnValue('#name #');
    patternBuilderBuildNConditionsMock.mockReturnValue('rebuilt-pattern');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles global Delete when join selector is open', () => {
    const props = buildProps({
      value: '#name #contains aspirin #',
      searchMode: baseSearchMode({ showJoinOperatorSelector: true }),
    });

    renderHook(() => useSearchKeyboard(props));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin##' },
      })
    );
  });

  it('handles group token insertion with ( and )', () => {
    const props = buildProps({
      value: '#name #contains aspirin #and #',
      searchMode: baseSearchMode({ isFilterMode: true }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));

    const openEvent = makeKeyEvent('(');
    act(() => {
      result.current.handleInputKeyDown(openEvent);
    });

    expect(openEvent.preventDefault).toHaveBeenCalled();
    expect(insertGroupOpenTokenMock).toHaveBeenCalledWith(
      '#name #contains aspirin #and #'
    );

    const closeEvent = makeKeyEvent(')', 'value');
    act(() => {
      result.current.handleInputKeyDown(closeEvent);
    });

    expect(insertGroupCloseTokenMock).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenCalled();
  });

  it('calls onInvalidGroupOpen when ( is not allowed', () => {
    const props = buildProps({
      value: '#name #contains aspirin',
      searchMode: baseSearchMode({ isFilterMode: true }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));

    const event = makeKeyEvent('(');
    act(() => {
      result.current.handleInputKeyDown(event);
    });

    expect(props.onInvalidGroupOpen).toHaveBeenCalled();
  });

  it('handles Escape behavior for selectors and clear-search', () => {
    const propsColumn = buildProps({
      searchMode: baseSearchMode({ showColumnSelector: true }),
    });
    const { result: columnResult } = renderHook(() =>
      useSearchKeyboard(propsColumn)
    );
    act(() => {
      columnResult.current.handleInputKeyDown(makeKeyEvent('Escape'));
    });
    expect(propsColumn.handleCloseColumnSelector).toHaveBeenCalled();

    const propsOperator = buildProps({
      searchMode: baseSearchMode({ showOperatorSelector: true }),
    });
    const { result: operatorResult } = renderHook(() =>
      useSearchKeyboard(propsOperator)
    );
    act(() => {
      operatorResult.current.handleInputKeyDown(makeKeyEvent('Escape'));
    });
    expect(propsOperator.handleCloseOperatorSelector).toHaveBeenCalled();

    const propsJoin = buildProps({
      searchMode: baseSearchMode({ showJoinOperatorSelector: true }),
    });
    const { result: joinResult } = renderHook(() =>
      useSearchKeyboard(propsJoin)
    );
    act(() => {
      joinResult.current.handleInputKeyDown(makeKeyEvent('Escape'));
    });
    expect(propsJoin.handleCloseJoinOperatorSelector).toHaveBeenCalled();

    const propsClear = buildProps({
      value: 'search text',
      searchMode: baseSearchMode(),
    });
    const { result: clearResult } = renderHook(() =>
      useSearchKeyboard(propsClear)
    );
    act(() => {
      clearResult.current.handleInputKeyDown(makeKeyEvent('Escape'));
    });
    expect(propsClear.onClearSearch).toHaveBeenCalled();
  });

  it('handles Enter confirmation for inRange and regular filters', () => {
    const propsDash = buildProps({
      value: '#stock #inRange 500-600',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '500-600',
          operator: 'inRange',
          column: {
            field: 'stock',
            headerName: 'Stock',
            searchable: true,
            type: 'number',
          },
          isExplicitOperator: true,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result: dashResult } = renderHook(() =>
      useSearchKeyboard(propsDash)
    );

    act(() => {
      dashResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });

    expect(propsDash.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#stock #inRange 500-600##' },
      })
    );

    const propsToMarker = buildProps({
      value: '#stock #inRange 500',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '500',
          operator: 'inRange',
          column: {
            field: 'stock',
            headerName: 'Stock',
            searchable: true,
            type: 'number',
          },
          isExplicitOperator: true,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result: toResult } = renderHook(() =>
      useSearchKeyboard(propsToMarker)
    );

    act(() => {
      toResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });

    expect(propsToMarker.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#stock #inRange 500 #to ' },
      })
    );

    const propsRegular = buildProps({
      value: '#name #contains aspirin',
      searchMode: baseSearchMode({
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
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result: regularResult } = renderHook(() =>
      useSearchKeyboard(propsRegular)
    );

    act(() => {
      regularResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });

    expect(propsRegular.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin##' },
      })
    );
    expect(propsRegular.onClearPreservedState).toHaveBeenCalled();
  });

  it('handles Delete for confirmed single-condition filters', () => {
    const propsInRange = buildProps({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          valueTo: '20',
          operator: 'inRange',
          column: {
            field: 'stock',
            headerName: 'Stock',
            searchable: true,
            type: 'number',
          },
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: false,
        },
      }),
    });

    const { result: inRangeResult } = renderHook(() =>
      useSearchKeyboard(propsInRange)
    );

    act(() => {
      inRangeResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });

    expect(propsInRange.editConditionValue).toHaveBeenCalledWith(0, 'valueTo');

    const propsRegular = buildProps({
      value: '#name #contains aspirin##',
      searchMode: baseSearchMode({
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
          isConfirmed: true,
          isMultiCondition: false,
        },
      }),
      editConditionValue: undefined,
      clearConditionPart: undefined,
    });

    const { result: regularResult } = renderHook(() =>
      useSearchKeyboard(propsRegular)
    );

    act(() => {
      regularResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });

    expect(propsRegular.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '#name #' } })
    );
  });

  it('handles generic Delete badge-unit removal in pattern mode', () => {
    const props = buildProps({
      value: '#name #contains a #and #stock #equals',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: {
              field: 'name',
              headerName: 'Name',
              searchable: true,
              type: 'text',
            },
          },
          {
            field: 'stock',
            operator: 'equals',
            value: '',
            column: {
              field: 'stock',
              headerName: 'Stock',
              searchable: true,
              type: 'number',
            },
          },
        ],
        joins: ['AND'],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: {
            field: 'name',
            headerName: 'Name',
            searchable: true,
            type: 'text',
          },
          isExplicitOperator: true,
          isMultiColumn: true,
        },
      }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));

    act(() => {
      result.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });

    expect(props.onChange).toHaveBeenCalled();
    const changedValue = (props.onChange as ReturnType<typeof vi.fn>).mock
      .calls[0][0].target.value;
    expect(changedValue).not.toBe('#name #contains a #and #stock #equals');
    expect(changedValue).toContain('#name #contains');
  });
});
