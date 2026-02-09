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

const nameColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text',
} as const;

const stockColumn = {
  field: 'stock',
  headerName: 'Stock',
  searchable: true,
  type: 'number',
} as const;

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

  it('handles additional global Delete branches for selector-open state', () => {
    const stepBackProps = buildProps({
      value: '#name #contains aspirin #',
      searchMode: baseSearchMode({ showColumnSelector: true }),
      onStepBackDelete: vi.fn(() => true),
    });

    renderHook(() => useSearchKeyboard(stepBackProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(stepBackProps.onStepBackDelete).toHaveBeenCalled();
    expect(stepBackProps.onChange).not.toHaveBeenCalled();

    const trailingJoinProps = buildProps({
      value: '#name #contains aspirin #and #',
      searchMode: baseSearchMode({ showColumnSelector: true }),
    });

    renderHook(() => useSearchKeyboard(trailingJoinProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(trailingJoinProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin #' },
      })
    );

    removeGroupTokenAtIndexMock.mockReturnValueOnce('#name #');
    const groupedProps = buildProps({
      value: '#( #',
      searchMode: baseSearchMode({ showColumnSelector: true }),
    });
    renderHook(() => useSearchKeyboard(groupedProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(removeGroupTokenAtIndexMock).toHaveBeenCalled();
    expect(groupedProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #' },
      })
    );
  });

  it('handles global Delete fallback by removing one trailing badge unit', () => {
    const props = buildProps({
      value: '#name #contains aspirin',
      searchMode: baseSearchMode({ showOperatorSelector: true }),
    });

    renderHook(() => useSearchKeyboard(props));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains' },
      })
    );
  });

  it('prevents character input when modal selector is open and supports Enter early-return', () => {
    const props = buildProps({
      value: '#name #',
      searchMode: baseSearchMode({ showOperatorSelector: true }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));

    const charEvent = makeKeyEvent('a');
    act(() => {
      result.current.handleInputKeyDown(charEvent);
    });
    expect(charEvent.preventDefault).toHaveBeenCalled();

    const enterEvent = makeKeyEvent('Enter');
    act(() => {
      result.current.handleInputKeyDown(enterEvent);
    });
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('covers Enter and Delete edge paths for partial and empty conditions', () => {
    const partialEnterProps = buildProps({
      value: '#name #contains #',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
        activeConditionIndex: 1,
        partialConditions: [
          {
            field: 'name',
            operator: 'contains',
            value: 'a',
            column: nameColumn,
          },
          {
            field: 'name',
            operator: 'contains',
            value: '',
            column: nameColumn,
          },
        ],
      }),
    });

    const { result: partialEnterResult } = renderHook(() =>
      useSearchKeyboard(partialEnterProps)
    );

    act(() => {
      partialEnterResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });
    expect(partialEnterProps.onChange).not.toHaveBeenCalled();

    const emptyContainsProps = buildProps({
      value: '',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: '',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: false,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result: emptyContainsResult } = renderHook(() =>
      useSearchKeyboard(emptyContainsProps)
    );

    act(() => {
      emptyContainsResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(emptyContainsProps.onClearSearch).toHaveBeenCalled();

    const emptyOperatorProps = buildProps({
      value: '',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '',
          operator: 'equals',
          column: stockColumn,
          isExplicitOperator: true,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result: emptyOperatorResult } = renderHook(() =>
      useSearchKeyboard(emptyOperatorProps)
    );

    act(() => {
      emptyOperatorResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(emptyOperatorProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#stock #' },
      })
    );
  });

  it('covers Enter branches for partial inRange and partial condition confirmations', () => {
    const inRangeToProps = buildProps({
      value: '#name #contains a #and #stock #inRange 10',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
      }),
    });
    const { result: inRangeToResult } = renderHook(() =>
      useSearchKeyboard(inRangeToProps)
    );
    act(() => {
      inRangeToResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });
    expect(inRangeToProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 10 #to ' },
      })
    );

    const inRangeDashProps = buildProps({
      value: '#name #contains a #and #stock #inRange 10-20',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
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
            value: '10-20',
            column: stockColumn,
          },
        ],
      }),
    });
    const { result: inRangeDashResult } = renderHook(() =>
      useSearchKeyboard(inRangeDashProps)
    );
    act(() => {
      inRangeDashResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });
    expect(inRangeDashProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #inRange 10-20##' },
      })
    );
    expect(inRangeDashProps.onClearPreservedState).toHaveBeenCalled();

    const partialConfirmProps = buildProps({
      value: '#name #contains a #and #stock #equals 10',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
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
            value: '10',
            column: stockColumn,
          },
        ],
      }),
    });
    const { result: partialConfirmResult } = renderHook(() =>
      useSearchKeyboard(partialConfirmProps)
    );
    act(() => {
      partialConfirmResult.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });
    expect(partialConfirmProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains a #and #stock #equals 10##' },
      })
    );
    expect(partialConfirmProps.onClearPreservedState).toHaveBeenCalled();
  });

  it('does not confirm inRange when #to marker already exists', () => {
    const props = buildProps({
      value: '#stock #inRange 10 #to',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));
    act(() => {
      result.current.handleInputKeyDown(makeKeyEvent('Enter'));
    });

    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('covers Delete-specific branches for join selector and callback fallbacks', () => {
    const stepBackProps = buildProps({
      value: 'plain-text',
      onStepBackDelete: vi.fn(() => true),
    });
    const { result: stepBackResult } = renderHook(() =>
      useSearchKeyboard(stepBackProps)
    );
    const stepBackEvent = makeKeyEvent('Delete');
    act(() => {
      stepBackResult.current.handleInputKeyDown(stepBackEvent);
    });
    expect(stepBackEvent.preventDefault).toHaveBeenCalled();

    const joinEmptyProps = buildProps({
      value: ' #',
      searchMode: baseSearchMode({ showJoinOperatorSelector: true }),
    });
    const { result: joinEmptyResult } = renderHook(() =>
      useSearchKeyboard(joinEmptyProps)
    );
    act(() => {
      joinEmptyResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(joinEmptyProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '' },
      })
    );

    const joinValueProps = buildProps({
      value: '#name #contains aspirin #',
      searchMode: baseSearchMode({ showJoinOperatorSelector: true }),
    });
    const { result: joinValueResult } = renderHook(() =>
      useSearchKeyboard(joinValueProps)
    );
    act(() => {
      joinValueResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(joinValueProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin##' },
      })
    );
  });

  it('covers Delete fallback paths for condition-part clearing and grouped patterns', () => {
    removeGroupTokenAtIndexMock.mockReturnValueOnce('group-updated');
    const groupedProps = buildProps({
      value: 'x #( #',
      searchMode: baseSearchMode(),
    });
    const { result: groupedResult } = renderHook(() =>
      useSearchKeyboard(groupedProps)
    );
    act(() => {
      groupedResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(groupedProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'group-updated' },
      })
    );

    const waitingBetweenProps = buildProps({
      value: 'free-text',
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          waitingForValueTo: true,
          isMultiCondition: false,
        },
      }),
    });
    const { result: waitingBetweenResult } = renderHook(() =>
      useSearchKeyboard(waitingBetweenProps)
    );
    act(() => {
      waitingBetweenResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(waitingBetweenProps.clearConditionPart).toHaveBeenCalledWith(
      0,
      'value'
    );

    const confirmedBetweenProps = buildProps({
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
          isMultiCondition: false,
        },
      }),
      editConditionValue: undefined,
    });
    const { result: confirmedBetweenResult } = renderHook(() =>
      useSearchKeyboard(confirmedBetweenProps)
    );
    act(() => {
      confirmedBetweenResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(confirmedBetweenProps.clearConditionPart).toHaveBeenCalledWith(
      0,
      'valueTo'
    );
  });

  it('covers Delete partial-edit branch replacements for grouped and trailing joins', () => {
    const groupedOperatorProps = buildProps({
      value: 'x #( #name #contains a #and #stock #equals',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
      }),
    });
    const { result: groupedOperatorResult } = renderHook(() =>
      useSearchKeyboard(groupedOperatorProps)
    );
    act(() => {
      groupedOperatorResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(groupedOperatorProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'x #( #name #contains a #and #stock #' },
      })
    );

    const trailingJoinProps = buildProps({
      value: 'base #and #',
      searchMode: baseSearchMode(),
    });
    const { result: trailingJoinResult } = renderHook(() =>
      useSearchKeyboard(trailingJoinProps)
    );
    act(() => {
      trailingJoinResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(trailingJoinProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'base##' },
      })
    );
  });

  it('covers Delete behavior on operator selector navigation variants', () => {
    patternBuilderBuildNConditionsMock.mockReturnValue('base-pattern');

    const groupedColumnSelectorProps = buildProps({
      value: 'x #( #name #contains a #and #stock #',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
        joins: ['AND'],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiColumn: true,
        },
      }),
    });
    const { result: groupedColumnSelectorResult } = renderHook(() =>
      useSearchKeyboard(groupedColumnSelectorProps)
    );
    act(() => {
      groupedColumnSelectorResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(groupedColumnSelectorProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'x #( #name #contains a #and #' },
      })
    );

    const rebuildColumnSelectorProps = buildProps({
      value: 'free-text',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
        joins: ['AND'],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiColumn: true,
        },
      }),
    });
    const { result: rebuildColumnSelectorResult } = renderHook(() =>
      useSearchKeyboard(rebuildColumnSelectorProps)
    );
    act(() => {
      rebuildColumnSelectorResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(rebuildColumnSelectorProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'base-pattern #and #' },
      })
    );

    const clearViaCallbackProps = buildProps({
      value: 'plain',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
      }),
    });
    const { result: clearViaCallbackResult } = renderHook(() =>
      useSearchKeyboard(clearViaCallbackProps)
    );
    act(() => {
      clearViaCallbackResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(clearViaCallbackProps.onClearSearch).toHaveBeenCalled();

    const clearViaChangeProps = buildProps({
      value: 'plain',
      onClearSearch: undefined,
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
      }),
    });
    const { result: clearViaChangeResult } = renderHook(() =>
      useSearchKeyboard(clearViaChangeProps)
    );
    act(() => {
      clearViaChangeResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });
    expect(clearViaChangeProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '' },
      })
    );
  });

  it('covers keyboard passthrough branches for selector navigation and normal keydown', () => {
    const selectorProps = buildProps({
      searchMode: baseSearchMode({ showColumnSelector: true }),
    });
    const { result: selectorResult } = renderHook(() =>
      useSearchKeyboard(selectorProps)
    );
    act(() => {
      selectorResult.current.handleInputKeyDown(makeKeyEvent('Tab'));
    });
    expect(selectorProps.onKeyDown).not.toHaveBeenCalled();

    const normalProps = buildProps({
      searchMode: baseSearchMode(),
    });
    const { result: normalResult } = renderHook(() =>
      useSearchKeyboard(normalProps)
    );
    const normalEvent = makeKeyEvent('x');
    act(() => {
      normalResult.current.handleInputKeyDown(normalEvent);
    });
    expect(normalProps.onKeyDown).toHaveBeenCalledWith(normalEvent);
  });

  it('handles operator-selector delete navigation and selected-column clear path', () => {
    patternBuilderBuildNConditionsMock.mockReturnValue('rebuilt-pattern');

    const operatorDeleteProps = buildProps({
      value: 'free-text',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
        partialJoin: 'AND',
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
            value: '',
            column: stockColumn,
          },
        ],
        joins: ['AND'],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiColumn: true,
        },
      }),
    });

    const { result: operatorDeleteResult } = renderHook(() =>
      useSearchKeyboard(operatorDeleteProps)
    );

    act(() => {
      operatorDeleteResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });

    expect(operatorDeleteProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'rebuilt-pattern' },
      })
    );

    const selectedColumnProps = buildProps({
      value: '#name',
      searchMode: baseSearchMode({
        selectedColumn: nameColumn,
      }),
    });

    const { result: selectedColumnResult } = renderHook(() =>
      useSearchKeyboard(selectedColumnProps)
    );

    act(() => {
      selectedColumnResult.current.handleInputKeyDown(makeKeyEvent('Delete'));
    });

    expect(selectedColumnProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '' },
      })
    );
  });

  it('covers confirmed inRange value deletion and empty-contains fallback without clear callback', () => {
    const confirmedBetweenEditProps = buildProps({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: false,
        },
      }),
    });
    const { result: confirmedBetweenEditResult } = renderHook(() =>
      useSearchKeyboard(confirmedBetweenEditProps)
    );
    act(() => {
      confirmedBetweenEditResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(confirmedBetweenEditProps.editConditionValue).toHaveBeenCalledWith(
      0,
      'value'
    );

    const confirmedBetweenClearProps = buildProps({
      editConditionValue: undefined,
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: stockColumn,
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: false,
        },
      }),
    });
    const { result: confirmedBetweenClearResult } = renderHook(() =>
      useSearchKeyboard(confirmedBetweenClearProps)
    );
    act(() => {
      confirmedBetweenClearResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(confirmedBetweenClearProps.clearConditionPart).toHaveBeenCalledWith(
      0,
      'value'
    );

    const emptyContainsFallbackProps = buildProps({
      onClearSearch: undefined,
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: '',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: false,
          isConfirmed: false,
          isMultiCondition: false,
        },
      }),
    });
    const { result: emptyContainsFallbackResult } = renderHook(() =>
      useSearchKeyboard(emptyContainsFallbackProps)
    );
    act(() => {
      emptyContainsFallbackResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(emptyContainsFallbackProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '' },
      })
    );
  });

  it('covers grouped regex deletes and filter-mode Enter passthrough return', () => {
    const groupedOperatorDeleteProps = buildProps({
      value: 'x #( #name #contains a #and #stock #equals',
      searchMode: baseSearchMode({
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          filterGroup: { kind: 'group', join: 'AND', nodes: [] },
        },
      }),
    });
    const { result: groupedOperatorDeleteResult } = renderHook(() =>
      useSearchKeyboard(groupedOperatorDeleteProps)
    );
    act(() => {
      groupedOperatorDeleteResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(groupedOperatorDeleteProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'x #( #name #contains a #and #stock #' },
      })
    );

    const groupedColumnDeleteProps = buildProps({
      value: 'x #( #name #contains a #and #stock #',
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        selectedColumn: stockColumn,
        partialJoin: 'AND',
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
            column: stockColumn,
          },
        ],
        joins: ['AND'],
        filterSearch: {
          field: 'name',
          value: 'a',
          operator: 'contains',
          column: nameColumn,
          isExplicitOperator: true,
          isMultiColumn: true,
          filterGroup: { kind: 'group', join: 'AND', nodes: [] },
        },
      }),
    });
    const { result: groupedColumnDeleteResult } = renderHook(() =>
      useSearchKeyboard(groupedColumnDeleteProps)
    );
    act(() => {
      groupedColumnDeleteResult.current.handleInputKeyDown(
        makeKeyEvent('Delete')
      );
    });
    expect(groupedColumnDeleteProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'x #( #name #contains a #and #' },
      })
    );

    const filterModeEnterPassthroughProps = buildProps({
      value: '',
      searchMode: baseSearchMode({
        isFilterMode: true,
      }),
    });
    const { result: filterModeEnterPassthroughResult } = renderHook(() =>
      useSearchKeyboard(filterModeEnterPassthroughProps)
    );
    act(() => {
      filterModeEnterPassthroughResult.current.handleInputKeyDown(
        makeKeyEvent('Enter')
      );
    });
    expect(filterModeEnterPassthroughProps.onChange).not.toHaveBeenCalled();
    expect(filterModeEnterPassthroughProps.onKeyDown).not.toHaveBeenCalled();
  });

  it('falls back to onKeyDown when handler throws', () => {
    insertGroupOpenTokenMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const props = buildProps({
      value: '#name #contains aspirin #and #',
      searchMode: baseSearchMode({ isFilterMode: true }),
    });

    const { result } = renderHook(() => useSearchKeyboard(props));

    act(() => {
      result.current.handleInputKeyDown(makeKeyEvent('('));
    });

    expect(props.onKeyDown).toHaveBeenCalled();
  });
});
