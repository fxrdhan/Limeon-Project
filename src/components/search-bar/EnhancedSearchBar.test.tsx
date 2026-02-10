import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnhancedSearchBar from './EnhancedSearchBar';
import type {
  EnhancedSearchState,
  FilterOperator,
  SearchColumn,
} from './types';

const useSearchStateMock = vi.hoisted(() => vi.fn());
const useSearchInputMock = vi.hoisted(() => vi.fn());
const useSearchKeyboardMock = vi.hoisted(() => vi.fn());
const useBadgeHandlersMock = vi.hoisted(() => vi.fn());
const useSelectionHandlersMock = vi.hoisted(() => vi.fn());
const useSelectorPositionMock = vi.hoisted(() => vi.fn());
const setFilterValueMock = vi.hoisted(() => vi.fn());

const capturedSearchBadgeProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedSearchIconProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedColumnSelectorProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedOperatorSelectorProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedJoinSelectorProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedSelectionHandlerArgs = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('./components/SearchIcon', () => ({
  default: (props: Record<string, unknown>) => {
    capturedSearchIconProps.current = props;
    return <div data-testid="search-icon" />;
  },
}));

vi.mock('./components/SearchBadge', () => ({
  default: (props: Record<string, unknown>) => {
    capturedSearchBadgeProps.current = props;
    return <div data-testid="search-badge" />;
  },
}));

vi.mock('./components/selectors/ColumnSelector', () => ({
  default: (props: Record<string, unknown>) => {
    capturedColumnSelectorProps.current = props;
    return <div data-testid="column-selector" />;
  },
}));

vi.mock('./components/selectors/OperatorSelector', () => ({
  default: (props: Record<string, unknown>) => {
    capturedOperatorSelectorProps.current = props;
    return <div data-testid="operator-selector" />;
  },
}));

vi.mock('./components/selectors/JoinOperatorSelector', () => ({
  default: (props: Record<string, unknown>) => {
    capturedJoinSelectorProps.current = props;
    return <div data-testid="join-selector" />;
  },
}));

vi.mock('./hooks/useSearchState', () => ({
  useSearchState: useSearchStateMock,
}));

vi.mock('./hooks/useSearchInput', () => ({
  useSearchInput: useSearchInputMock,
}));

vi.mock('./hooks/useSearchKeyboard', () => ({
  useSearchKeyboard: useSearchKeyboardMock,
}));

vi.mock('./hooks/useBadgeHandlers', () => ({
  useBadgeHandlers: useBadgeHandlersMock,
}));

vi.mock('./hooks/useSelectionHandlers', () => ({
  useSelectionHandlers: useSelectionHandlersMock,
}));

vi.mock('./hooks/useSelectorPosition', () => ({
  useSelectorPosition: useSelectorPositionMock,
}));

vi.mock('./utils/handlerHelpers', async () => {
  const actual = await vi.importActual<typeof import('./utils/handlerHelpers')>(
    './utils/handlerHelpers'
  );
  return {
    ...actual,
    setFilterValue: setFilterValueMock,
  };
});

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama',
    searchable: true,
    type: 'text',
  },
  {
    field: 'stock',
    headerName: 'Stok',
    searchable: true,
    type: 'number',
  },
];

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

const makeOperator = (value: string): FilterOperator => ({
  value,
  label: value,
  description: value,
  icon: null,
});

describe('EnhancedSearchBar', () => {
  beforeEach(() => {
    vi.useRealTimers();
    capturedSearchBadgeProps.current = null;
    capturedSearchIconProps.current = null;
    capturedColumnSelectorProps.current = null;
    capturedOperatorSelectorProps.current = null;
    capturedJoinSelectorProps.current = null;
    capturedSelectionHandlerArgs.current = null;

    setFilterValueMock.mockReset();
    useSearchStateMock.mockReset();
    useSearchInputMock.mockReset();
    useSearchKeyboardMock.mockReset();
    useBadgeHandlersMock.mockReset();
    useSelectionHandlersMock.mockReset();
    useSelectorPositionMock.mockReset();

    useSearchStateMock.mockReturnValue({ searchMode: baseSearchMode() });
    useSearchInputMock.mockReturnValue({
      displayValue: '',
      showTargetedIndicator: false,
      operatorSearchTerm: '',
      handleInputChange: vi.fn(),
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef: () => ({ current: null }),
      getLazyOperatorRef: () => ({ current: null }),
      getLazyJoinRef: () => ({ current: null }),
      getLazyBadgeRef: () => ({ current: null }),
    });
    useSearchKeyboardMock.mockReturnValue({
      handleInputKeyDown: vi.fn(),
    });
    useBadgeHandlersMock.mockReturnValue({
      clearConditionPart: vi.fn(),
      clearJoin: vi.fn(),
      clearAll: vi.fn(),
      editConditionPart: vi.fn(),
      editJoin: vi.fn(),
      editValueN: vi.fn(),
    });
    useSelectionHandlersMock.mockImplementation(
      (args: Record<string, unknown>) => {
        capturedSelectionHandlerArgs.current = args;
        return {
          handleColumnSelect: vi.fn(),
          handleOperatorSelect: vi.fn(),
          handleJoinOperatorSelect: vi.fn(),
        };
      }
    );
    useSelectorPositionMock.mockReturnValue({ top: 8, left: 12 });
  });

  it('handles grouped selector selections via setFilterValue and close action', () => {
    const onChange = vi.fn();
    const onClearSearch = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showOperatorSelector: true,
        showJoinOperatorSelector: true,
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
        },
      }),
    });
    useSearchInputMock.mockReturnValue({
      displayValue: '#',
      showTargetedIndicator: false,
      operatorSearchTerm: '',
      handleInputChange: vi.fn(),
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef: () => ({ current: null }),
      getLazyOperatorRef: () => ({ current: null }),
      getLazyJoinRef: () => ({ current: null }),
      getLazyBadgeRef: () => ({ current: null }),
    });

    render(
      <EnhancedSearchBar
        value="#( #name #contains aspirin #"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedColumnSelectorProps.current?.onSelect as
          | ((column: SearchColumn) => void)
          | undefined
      )?.(columns[1]);
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onSelect as
          | ((operator: FilterOperator) => void)
          | undefined
      )?.(makeOperator('equals'));
    });
    act(() => {
      (
        capturedJoinSelectorProps.current?.onSelect as
          | ((joinOp: { value: string }) => void)
          | undefined
      )?.({ value: 'or' });
    });

    expect(setFilterValueMock).toHaveBeenCalledTimes(3);

    act(() => {
      (
        capturedColumnSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });

    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('handles badge keyboard shortcuts and delegates non-shortcut keydown', () => {
    const onEditBadge = vi.fn();
    const onClearBadge = vi.fn();
    const onChange = vi.fn();
    const inputChangeSpy = vi.fn();
    const inputKeyDownSpy = vi.fn();

    useSearchInputMock.mockReturnValue({
      displayValue: 'asp',
      showTargetedIndicator: false,
      operatorSearchTerm: '',
      handleInputChange: inputChangeSpy,
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef: () => ({ current: null }),
      getLazyOperatorRef: () => ({ current: null }),
      getLazyJoinRef: () => ({ current: null }),
      getLazyBadgeRef: () => ({ current: null }),
    });
    useSearchKeyboardMock.mockReturnValue({
      handleInputKeyDown: inputKeyDownSpy,
    });

    render(
      <EnhancedSearchBar value="asp" onChange={onChange} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(1);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        {
          id: 'condition-0-value',
          type: 'value',
          label: 'asp',
          canEdit: true,
          onEdit: onEditBadge,
          canClear: true,
          onClear: onClearBadge,
        },
      ]);
    });

    const input = screen.getByPlaceholderText('Cari...');
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'ArrowLeft', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'x' });
    fireEvent.change(input, { target: { value: 'ibuprofen' } });

    expect(onEditBadge).toHaveBeenCalledTimes(1);
    expect(onClearBadge).toHaveBeenCalledTimes(1);
    expect(inputKeyDownSpy).toHaveBeenCalledTimes(1);
    expect(inputChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('uses Ctrl+I to close selector flow and keeps grouped join state for selector props', () => {
    const onChange = vi.fn();
    const onClearSearch = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showJoinOperatorSelector: true,
      }),
    });
    useSearchInputMock.mockReturnValue({
      displayValue: '#unknown',
      showTargetedIndicator: true,
      operatorSearchTerm: '',
      handleInputChange: vi.fn(),
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef: () => ({ current: null }),
      getLazyOperatorRef: () => ({ current: null }),
      getLazyJoinRef: () => ({ current: null }),
      getLazyBadgeRef: () => ({ current: null }),
    });

    render(
      <EnhancedSearchBar
        value="#( #name #contains aspirin #or #"
        onChange={onChange}
        onClearSearch={onClearSearch}
        placeholder="Placeholder kustom"
        searchState="found"
        resultsCount={5}
        columns={columns}
      />
    );

    expect(screen.getByText('5 hasil ditemukan')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Cari...');
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });

    expect(onClearSearch).toHaveBeenCalledTimes(1);

    const joinProps = capturedJoinSelectorProps.current as {
      currentValue?: string;
      operators?: Array<{ value: string }>;
    };
    expect(joinProps.currentValue).toBe('OR');
    expect(joinProps.operators).toHaveLength(1);
    expect(joinProps.operators?.[0]).toMatchObject({ value: 'or' });
  });

  it('exposes step-back delete handler through keyboard hook args', () => {
    const onChange = vi.fn();

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #stock #equals 10##"
        onChange={onChange}
        columns={columns}
      />
    );

    const keyboardArgs = useSearchKeyboardMock.mock.calls[0]?.[0] as
      | { onStepBackDelete?: () => boolean }
      | undefined;
    expect(keyboardArgs?.onStepBackDelete).toBeTypeOf('function');

    expect(keyboardArgs?.onStepBackDelete?.()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin #and #stock #equals ' },
      })
    );

    expect(keyboardArgs?.onStepBackDelete?.()).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: { value: '#name #contains aspirin #and #stock #' },
      })
    );
  });

  it('triggers and clears invalid-group input error state', () => {
    vi.useFakeTimers();

    render(
      <EnhancedSearchBar value="#" onChange={vi.fn()} columns={columns} />
    );

    const keyboardArgs = useSearchKeyboardMock.mock.calls[0]?.[0] as
      | { onInvalidGroupOpen?: () => void }
      | undefined;

    act(() => {
      keyboardArgs?.onInvalidGroupOpen?.();
    });
    expect(capturedSearchIconProps.current).toMatchObject({ showError: true });

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(capturedSearchIconProps.current).toMatchObject({ showError: false });
  });

  it('applies grouped edit/clear callbacks and propagates selector updates', () => {
    const onChange = vi.fn();
    const clearAll = vi.fn();

    useBadgeHandlersMock.mockReturnValue({
      clearConditionPart: vi.fn(),
      clearJoin: vi.fn(),
      clearAll,
      editConditionPart: vi.fn(),
      editJoin: vi.fn(),
      editValueN: vi.fn(),
    });
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showOperatorSelector: true,
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'name',
                column: columns[0],
                operator: 'contains',
                value: 'aspirin',
              },
              {
                kind: 'group',
                join: 'OR',
                nodes: [
                  {
                    kind: 'condition',
                    field: 'stock',
                    column: columns[1],
                    operator: 'equals',
                    value: '10',
                  },
                ],
              },
            ],
          },
        },
      }),
    });
    useSearchInputMock.mockReturnValue({
      displayValue: '#',
      showTargetedIndicator: false,
      operatorSearchTerm: '',
      handleInputChange: vi.fn(),
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef: () => ({ current: null }),
      getLazyOperatorRef: () => ({ current: null }),
      getLazyJoinRef: () => ({ current: null }),
      getLazyBadgeRef: () => ({ current: null }),
    });

    render(
      <EnhancedSearchBar
        value="#( #name #contains aspirin #and #( #stock #equals 10 #) #)##"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditColumn as
          | ((path: number[]) => void)
          | undefined
      )?.([0]);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '#' } })
    );

    act(() => {
      (
        capturedColumnSelectorProps.current?.onSelect as
          | ((column: SearchColumn) => void)
          | undefined
      )?.(columns[1]);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#'),
        }),
      })
    );

    act(() => {
      (
        capturedOperatorSelectorProps.current?.onSelect as
          | ((operator: FilterOperator) => void)
          | undefined
      )?.(makeOperator('equals'));
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#equals'),
        }),
      })
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupClearCondition as
          | ((path: number[]) => void)
          | undefined
      )?.([1, 0]);
    });
    expect(onChange).toHaveBeenCalled();

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupTokenClear as
          | ((type: 'groupOpen' | 'groupClose', idx: number) => void)
          | undefined
      )?.('groupOpen', 0);
    });
    expect(setFilterValueMock).toHaveBeenCalledTimes(1);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupClearGroup as
          | ((path: number[]) => void)
          | undefined
      )?.([]);
    });
    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it('reconstructs multi-condition keyboard change payloads and confirmation', () => {
    const onChange = vi.fn();
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          conditions: [
            { field: 'name', operator: 'contains', value: 'aspirin' },
            { field: 'name', operator: 'equals', value: '10' },
          ],
          joinOperator: 'AND',
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #equals 10##"
        onChange={onChange}
        columns={columns}
      />
    );

    const keyboardArgs = useSearchKeyboardMock.mock.calls[0]?.[0] as
      | { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }
      | undefined;

    keyboardArgs?.onChange?.({
      target: { value: 'programmatic' },
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: 'programmatic' },
      })
    );

    const realInput = document.createElement('input');
    realInput.value = '250';
    keyboardArgs?.onChange?.({
      target: realInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains aspirin #and #equals 250',
        }),
      })
    );

    realInput.value = '500##';
    keyboardArgs?.onChange?.({
      target: realInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '500 #and #equals 10##',
        }),
      })
    );

    realInput.value = '';
    keyboardArgs?.onChange?.({
      target: realInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains aspirin #and #',
        }),
      })
    );
  });

  it('handles global Ctrl+D capture when badge is selected', () => {
    const onClearBadge = vi.fn();

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(1);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        {
          id: 'condition-0-value',
          type: 'value',
          label: 'asp',
          canEdit: true,
          onEdit: vi.fn(),
          canClear: true,
          onClear: onClearBadge,
        },
      ]);
    });

    const input = screen.getByPlaceholderText('Cari...');
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true });

    expect(onClearBadge).toHaveBeenCalledTimes(1);
  });

  it('handles grouped join editing and join-selector apply flow', () => {
    const onChange = vi.fn();
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showJoinOperatorSelector: true,
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'name',
                column: columns[0],
                operator: 'contains',
                value: 'aspirin',
              },
              {
                kind: 'condition',
                field: 'stock',
                column: columns[1],
                operator: 'equals',
                value: '10',
              },
            ],
          },
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#( #name #contains aspirin #and #stock #equals 10 #)##"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditJoin as
          | ((path: number[], joinIndex: number) => void)
          | undefined
      )?.([], 0);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#contains aspirin'),
        }),
      })
    );

    act(() => {
      (
        capturedJoinSelectorProps.current?.onSelect as
          | ((joinOp: { value: string }) => void)
          | undefined
      )?.({ value: 'or' });
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#or'),
        }),
      })
    );
  });

  it('handles grouped inline edit complete with range split and empty clear', () => {
    const onChange = vi.fn();
    const clearAll = vi.fn();

    useBadgeHandlersMock.mockReturnValue({
      clearConditionPart: vi.fn(),
      clearJoin: vi.fn(),
      clearAll,
      editConditionPart: vi.fn(),
      editJoin: vi.fn(),
      editValueN: vi.fn(),
    });
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: columns[1],
          isExplicitOperator: true,
          isConfirmed: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'stock',
                column: columns[1],
                operator: 'inRange',
                value: '10',
                valueTo: '20',
              },
            ],
          },
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#( #stock #inRange 10 #to 20 #)##"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditStart as
          | ((
              path: number[],
              field: 'value' | 'valueTo',
              value: string
            ) => void)
          | undefined
      )?.([0], 'value', '10');
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupInlineValueChange as
          | ((value: string) => void)
          | undefined
      )?.('30-40');
      (
        capturedSearchBadgeProps.current?.onGroupInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('30-40');
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#to 40'),
        }),
      })
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditStart as
          | ((
              path: number[],
              field: 'value' | 'valueTo',
              value: string
            ) => void)
          | undefined
      )?.([0], 'value', '30');
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupInlineValueChange as
          | ((value: string) => void)
          | undefined
      )?.('');
      (
        capturedSearchBadgeProps.current?.onGroupInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it('handles operator/join selector close flows', () => {
    const onChange = vi.fn();
    const onClearSearch = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        showJoinOperatorSelector: true,
        selectedColumn: columns[0],
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#name'),
        }),
      })
    );

    act(() => {
      (
        capturedJoinSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains aspirin##',
        }),
      })
    );
    expect(onClearSearch).not.toHaveBeenCalled();
  });

  it('navigates editable badges from badge callback and skips non-editable targets', () => {
    vi.useFakeTimers();
    const firstEdit = vi.fn();
    const secondEdit = vi.fn();
    const firstClear = vi.fn();

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    const badgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            setEditingBadge?: (
              value: {
                conditionIndex: number;
                field: 'value' | 'valueTo';
                value: string;
              } | null
            ) => void;
          }
        | undefined;

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(3);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        { id: 'b0', canEdit: false },
        {
          id: 'b1',
          canEdit: true,
          canClear: true,
          onEdit: firstEdit,
          onClear: firstClear,
        },
        { id: 'b2', canEdit: true, onEdit: secondEdit },
      ]);
    });

    act(() => {
      (
        capturedSearchBadgeProps.current?.onNavigateEdit as
          | ((direction: 'left' | 'right') => void)
          | undefined
      )?.('right');
      vi.advanceTimersByTime(60);
    });
    expect(firstEdit).toHaveBeenCalledTimes(1);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onNavigateEdit as
          | ((direction: 'left' | 'right') => void)
          | undefined
      )?.('left');
      vi.advanceTimersByTime(60);
    });
    expect(secondEdit).toHaveBeenCalledTimes(1);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });
    expect(firstClear).toHaveBeenCalledTimes(0);
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });
    expect(firstClear).toHaveBeenCalledTimes(1);

    act(() => {
      badgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: 'asp',
      });
    });
    fireEvent.keyDown(input, { key: 'ArrowLeft', ctrlKey: true });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onNavigateEdit as
          | ((direction: 'left' | 'right') => void)
          | undefined
      )?.('right');
      vi.advanceTimersByTime(60);
    });
    expect(firstEdit).toHaveBeenCalledTimes(2);
  });

  it('focuses input from badge callback and closes open selector flows', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showOperatorSelector: true,
        showJoinOperatorSelector: true,
        selectedColumn: columns[0],
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onFocusInput as
          | (() => void)
          | undefined
      )?.();
      vi.advanceTimersByTime(70);
    });

    expect(onChange).toHaveBeenCalled();
  });

  it('updates selector defaults from grouped edit callbacks and fuzzy column search term', () => {
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        showColumnSelector: true,
        showOperatorSelector: true,
        selectedColumn: columns[1],
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'equals',
          column: columns[1],
          isExplicitOperator: true,
          isConfirmed: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'stock',
                column: columns[1],
                operator: 'equals',
                value: '10',
              },
            ],
          },
        },
      }),
    });

    render(
      <EnhancedSearchBar value="#sto" onChange={onChange} columns={columns} />
    );

    const initialColumns = (capturedColumnSelectorProps.current?.columns ||
      []) as Array<{ field: string }>;
    expect(initialColumns[0]?.field).toBe('stock');

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditColumn as
          | ((path: number[]) => void)
          | undefined
      )?.([0]);
    });
    const columnIndex = capturedColumnSelectorProps.current
      ?.defaultSelectedIndex as number | undefined;
    expect(columnIndex).toBe(0);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditOperator as
          | ((path: number[]) => void)
          | undefined
      )?.([0]);
    });
    const operatorIndex = capturedOperatorSelectorProps.current
      ?.defaultSelectedIndex as number | undefined;
    expect(typeof operatorIndex).toBe('number');
  });

  it('handles inline edit clearing for first value and valueTo transitions', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          valueTo: '20',
          operator: 'inRange',
          column: columns[1],
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#stock #inRange 10 #to 20##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setEditingBadge?: (
            value: {
              conditionIndex: number;
              field: 'value' | 'valueTo';
              value: string;
            } | null
          ) => void;
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
        }
      | undefined;
    const clearConditionPart = useBadgeHandlersMock.mock.results[0]?.value
      ?.clearConditionPart as ReturnType<typeof vi.fn>;

    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearConditionPart).toHaveBeenCalledWith(0, 'value');

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '10',
            valueTo: '20',
            operator: 'inRange',
            column: columns[1],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        }),
      });
    });
    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'valueTo',
        value: '20',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(20);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #inRange 10##',
        }),
      })
    );
  });

  it('handles inline clear transition for second condition valueTo in multi-condition mode', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          joinOperator: 'AND',
          conditions: [
            { field: 'name', operator: 'contains', value: 'aspirin' },
            { field: 'name', operator: 'inRange', value: '30', valueTo: '40' },
          ],
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #inRange 30 #to 40##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setEditingBadge?: (
            value: {
              conditionIndex: number;
              field: 'value' | 'valueTo';
              value: string;
            } | null
          ) => void;
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            joinOperator: 'AND',
            conditions: [
              { field: 'name', operator: 'contains', value: 'aspirin' },
              {
                field: 'name',
                operator: 'inRange',
                value: '30',
                valueTo: '40',
              },
            ],
          },
        }),
      });
    });
    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'valueTo',
        value: '40',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(20);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#inRange 30##'),
        }),
      })
    );
  });

  it('handles inline edit complete for between split value and waiting valueTo states', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const externalInputRef = React.createRef<HTMLInputElement>();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          operator: 'inRange',
          column: columns[1],
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#stock #inRange 10##"
        onChange={onChange}
        inputRef={externalInputRef}
        columns={columns}
      />
    );

    expect(externalInputRef.current).toBeTruthy();
    const setSelectionRangeSpy = vi.spyOn(
      externalInputRef.current as HTMLInputElement,
      'setSelectionRange'
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setEditingBadge?: (
            value: {
              conditionIndex: number;
              field: 'value' | 'valueTo';
              value: string;
            } | null
          ) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('30-40');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #inRange 30 #to 40##',
        }),
      })
    );

    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('55');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #inRange 55 #to ',
        }),
      })
    );
    expect(setSelectionRangeSpy).toHaveBeenCalled();
  });

  it('runs insert-condition flow and selection-handler setter branches', () => {
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        showColumnSelector: true,
        showOperatorSelector: true,
        activeConditionIndex: 2,
        selectedColumn: columns[1],
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          isMultiColumn: true,
          joins: ['AND', 'AND'],
          joinOperator: 'AND',
          conditions: [
            { field: 'name', operator: 'contains', value: 'aspirin' },
            { field: 'stock', operator: 'equals', value: '10' },
            { field: 'stock', operator: 'greaterThan', value: '5' },
          ],
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #stock #equals 10 #and #stock #greaterThan 5##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
          setEditingSelectorTarget?: (
            value: {
              conditionIndex: number;
              target: 'column' | 'operator' | 'join';
            } | null
          ) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          selectedColumn: columns[1],
          partialConditions: [
            {
              field: 'name',
              column: columns[0],
              operator: 'contains',
              value: 'a',
            },
            {
              field: 'stock',
              column: columns[1],
              operator: 'equals',
              value: '10',
            },
            {
              field: 'stock',
              column: columns[1],
              operator: 'greaterThan',
              value: '5',
            },
          ],
          filterSearch: {
            field: 'name',
            value: 'a',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            conditions: [
              { field: 'name', operator: 'contains', value: 'a' },
              { field: 'stock', operator: 'equals', value: '10' },
              { field: 'stock', operator: 'greaterThan', value: '5' },
            ],
          },
        }),
      });
    });

    act(() => {
      (
        capturedSelectionHandlerArgs.current?.setIsEditingSecondOperator as
          | ((editing: boolean) => void)
          | undefined
      )?.(true);
    });
    expect(
      capturedOperatorSelectorProps.current?.defaultSelectedIndex
    ).toBeDefined();

    act(() => {
      badgeHookArgs?.setEditingSelectorTarget?.({
        conditionIndex: 1,
        target: 'column',
      });
    });
    expect(
      capturedColumnSelectorProps.current?.defaultSelectedIndex
    ).toBeDefined();

    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(0);
    });

    expect(setFilterValueMock).toHaveBeenCalled();
  });

  it('handles advanced multi-condition inline edit branches for valueTo clear and rebuild', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
          isMultiCondition: true,
          isMultiColumn: true,
          joins: ['AND', 'AND'],
          joinOperator: 'AND',
          conditions: [
            { field: 'name', operator: 'contains', value: 'aspirin' },
            { field: 'stock', operator: 'equals', value: '10' },
            { field: 'stock', operator: 'inRange', value: '50', valueTo: '60' },
          ],
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #stock #equals 10 #and #stock #inRange 50 #to 60##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
          setEditingBadge?: (
            value: {
              conditionIndex: number;
              field: 'value' | 'valueTo';
              value: string;
            } | null
          ) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            isMultiColumn: true,
            joins: ['AND', 'AND'],
            joinOperator: 'AND',
            conditions: [
              { field: 'name', operator: 'contains', value: 'aspirin' },
              { field: 'stock', operator: 'inRange', value: '10' },
              {
                field: 'stock',
                operator: 'inRange',
                value: '50',
                valueTo: '60',
              },
            ],
          },
        }),
      });
    });
    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 2,
        field: 'valueTo',
        value: '60',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalled();

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            isMultiColumn: true,
            joins: ['AND'],
            joinOperator: 'AND',
            conditions: [
              { field: 'name', operator: 'contains', value: 'aspirin' },
              { field: 'stock', operator: 'inRange', value: '10' },
            ],
          },
        }),
      });
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('15');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#to '),
        }),
      })
    );
  });

  it('scrolls badges area to end when input is focused and value changes', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    let rafCallback: FrameRequestCallback | null = null;
    const raf = vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);

    const { rerender } = render(
      <EnhancedSearchBar
        value="asp"
        onChange={vi.fn()}
        columns={columns}
        inputRef={inputRef}
      />
    );
    const input = screen.getByPlaceholderText('Cari...');

    act(() => {
      input.focus();
    });
    rerender(
      <EnhancedSearchBar
        value="aspi"
        onChange={vi.fn()}
        columns={columns}
        inputRef={inputRef}
      />
    );
    const rerenderedInput = screen.getByPlaceholderText('Cari...');
    act(() => {
      rerenderedInput.focus();
    });
    rerender(
      <EnhancedSearchBar
        value="aspix"
        onChange={vi.fn()}
        columns={columns}
        inputRef={inputRef}
      />
    );

    expect(rafCallback).not.toBeNull();

    act(() => {
      rafCallback?.(0);
    });

    expect(raf).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('covers insert-flow cancellation and finalize branches through rerendered values', () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);

    const onChange = vi.fn();
    let dynamicMode: EnhancedSearchState = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
        isMultiCondition: true,
        isMultiColumn: true,
        joins: ['AND', 'AND'],
        joinOperator: 'AND',
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '10' },
          { field: 'stock', operator: 'greaterThan', value: '5' },
        ],
      },
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #stock #equals 10 #and #stock #greaterThan 5##"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(0);
    });

    dynamicMode = baseSearchMode({ isFilterMode: false });
    view.rerender(
      <EnhancedSearchBar value="" onChange={onChange} columns={columns} />
    );

    dynamicMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
        isMultiCondition: true,
        isMultiColumn: true,
        joins: ['OR'],
        joinOperator: 'OR',
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { field: 'stock', operator: 'equals', value: '9' },
        ],
      },
    });
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains aspirin #or #stock #equals 9##"
        onChange={onChange}
        columns={columns}
      />
    );

    expect(raf).toHaveBeenCalled();
    expect(setFilterValueMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('covers inline value-change, generic clear timeout, single and multi save timeouts', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
          setEditingBadge?: (
            value: {
              conditionIndex: number;
              field: 'value' | 'valueTo';
              value: string;
            } | null
          ) => void;
        }
      | undefined;
    const clearConditionPart = useBadgeHandlersMock.mock.results[0]?.value
      ?.clearConditionPart as ReturnType<typeof vi.fn>;

    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 2,
        field: 'value',
        value: 'x',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineValueChange as
          | ((value: string) => void)
          | undefined
      )?.('y');
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(80);
    });
    expect(clearConditionPart).toHaveBeenCalledWith(2, 'value');

    act(() => {
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: 'aspirin',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('ibuprofen');
      vi.advanceTimersByTime(80);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains ibuprofen##',
        }),
      })
    );

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            joinOperator: 'AND',
            joins: ['AND'],
            conditions: [
              { field: 'name', operator: 'contains', value: 'aspirin' },
              { field: 'stock', operator: 'equals', value: '10' },
            ],
          },
        }),
      });
      badgeHookArgs?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('22');
      vi.advanceTimersByTime(80);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#equals 22'),
        }),
      })
    );
  });

  it('covers operator/column default index fallback branches for preserved partial state', () => {
    const onChange = vi.fn();
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        showColumnSelector: true,
        activeConditionIndex: 2,
        selectedColumn: columns[1],
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #and #stock #equals 10 #and #"
        onChange={onChange}
        columns={[
          columns[0],
          columns[1],
          {
            field: 'name_alias',
            headerName: 'Nama Alias',
            searchable: true,
            type: 'text',
          },
        ]}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
          setEditingSelectorTarget?: (
            value: {
              conditionIndex: number;
              target: 'column' | 'operator' | 'join';
            } | null
          ) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          selectedColumn: columns[1],
          partialConditions: [
            { field: 'name', column: columns[0], operator: 'contains' },
            { field: 'stock', column: columns[1], operator: 'equals' },
            { field: 'stock', column: columns[1], operator: 'equals' },
          ],
        }),
      });
    });

    expect(
      capturedOperatorSelectorProps.current?.defaultSelectedIndex
    ).toBeDefined();
    expect(capturedColumnSelectorProps.current?.defaultSelectedIndex).toBe(1);
  });

  it('covers second-operator partial fallback and selected-column fallback indexes', () => {
    const onChange = vi.fn();
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showOperatorSelector: true,
        showColumnSelector: true,
        selectedColumn: columns[1],
      }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains aspirin #"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls[0]?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.({
        ...baseSearchMode({
          selectedColumn: columns[1],
          partialConditions: [
            { field: 'name', column: columns[0], operator: 'contains' },
            { field: 'stock', column: columns[1], operator: 'equals' },
          ],
        }),
      });
      badgeHookArgs?.setEditingSelectorTarget?.({
        conditionIndex: 1,
        target: 'operator',
      });
    });

    expect(
      capturedOperatorSelectorProps.current?.defaultSelectedIndex
    ).toBeDefined();

    act(() => {
      badgeHookArgs?.setEditingSelectorTarget?.(null);
    });

    expect(capturedColumnSelectorProps.current).toBeTruthy();
  });

  it('handles second-operator toggle and input-error timeout cleanup', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    const { unmount } = render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    act(() => {
      (
        capturedSelectionHandlerArgs.current?.setIsEditingSecondOperator as
          | ((editing: boolean) => void)
          | undefined
      )?.(true);
    });
    act(() => {
      (
        capturedSelectionHandlerArgs.current?.setIsEditingSecondOperator as
          | ((editing: boolean) => void)
          | undefined
      )?.(false);
    });

    act(() => {
      (
        capturedSearchBadgeProps.current?.onInvalidValue as
          | (() => void)
          | undefined
      )?.();
      (
        capturedSearchBadgeProps.current?.onInvalidValue as
          | (() => void)
          | undefined
      )?.();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('covers additional keyboard badge navigation/edit/delete branches and global input guard', () => {
    const onEdit = vi.fn();
    const onClear = vi.fn();

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(3);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        { id: 'sep-0', type: 'separator' },
        { id: 'badge-1', canEdit: false, canClear: false },
        { id: 'badge-2', canEdit: true, onEdit, canClear: true, onClear },
      ]);
    });

    const input = screen.getByPlaceholderText('Cari...');

    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true }); // select index 1 (skip separator edge)
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true }); // selected but not clearable
    expect(onClear).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'e', ctrlKey: true }); // wrap left and find editable badge
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true }); // move past end -> deselect
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true }); // selected null branch
    expect(onClear).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowLeft', ctrlKey: true }); // select last badge from edge
    const badgeInput = document.createElement('input');
    badgeInput.className = 'badge-edit-input';
    document.body.appendChild(badgeInput);
    fireEvent.keyDown(badgeInput, { key: 'd', ctrlKey: true }); // global guard should early return
    expect(onClear).not.toHaveBeenCalled();
    badgeInput.remove();

    fireEvent.keyDown(input, { key: 'd', ctrlKey: true }); // clear selected badge
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('restores and clears selectors through close handlers across branch paths', () => {
    const onChange = vi.fn();
    const onClearSearch = vi.fn();

    let dynamicMode: EnhancedSearchState = baseSearchMode({
      showColumnSelector: true,
      showOperatorSelector: true,
      showJoinOperatorSelector: true,
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#unknown"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );

    const getBadgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            setPreservedSearchMode?: (
              value: EnhancedSearchState | null
            ) => void;
            setEditingSelectorTarget?: (
              value: {
                conditionIndex: number;
                target: 'column' | 'operator' | 'join';
              } | null
            ) => void;
          }
        | undefined;

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({ selectedColumn: columns[0] })
      );
    });
    act(() => {
      (
        capturedColumnSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name #' }),
      })
    );

    dynamicMode = baseSearchMode({ showColumnSelector: true });
    view.rerender(
      <EnhancedSearchBar value="#zzz" onChange={onChange} columns={columns} />
    );
    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.(null);
    });
    act(() => {
      (
        capturedColumnSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '' }),
      })
    );

    dynamicMode = baseSearchMode({ showOperatorSelector: true });
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains aspirin"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );
    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: false,
            isMultiCondition: true,
            conditions: [
              { field: 'name', operator: 'contains', value: 'aspirin' },
              { field: 'stock', operator: 'equals', value: '10' },
            ],
            joins: ['AND'],
            joinOperator: 'AND',
          },
        }),
      });
      getBadgeHookArgs()?.setEditingSelectorTarget?.({
        conditionIndex: 0,
        target: 'operator',
      });
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalled();

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: false,
          },
        }),
      });
      getBadgeHookArgs()?.setEditingSelectorTarget?.({
        conditionIndex: 0,
        target: 'operator',
      });
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#name'),
        }),
      })
    );

    const callCountBeforeGuard = onChange.mock.calls.length;
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains aspirin##"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );
    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.(null);
      getBadgeHookArgs()?.setEditingSelectorTarget?.(null);
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange.mock.calls.length).toBe(callCountBeforeGuard);

    view.rerender(
      <EnhancedSearchBar
        value="plain"
        onChange={onChange}
        onClearSearch={onClearSearch}
        columns={columns}
      />
    );
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onClearSearch).toHaveBeenCalled();

    view.rerender(
      <EnhancedSearchBar value="plain" onChange={onChange} columns={columns} />
    );
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '' }),
      })
    );

    dynamicMode = baseSearchMode({ showJoinOperatorSelector: true });
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains aspirin #"
        onChange={onChange}
        columns={columns}
      />
    );
    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        }),
      });
    });
    act(() => {
      (
        capturedJoinSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('##'),
        }),
      })
    );
  });

  it('covers additional inline edit branches for clear and inRange transitions', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        isFilterMode: true,
        filterSearch: {
          field: 'stock',
          value: '10',
          valueTo: '20',
          operator: 'inRange',
          column: columns[1],
          isExplicitOperator: true,
          isConfirmed: true,
        },
      }),
    });

    render(
      <EnhancedSearchBar
        value="#stock #inRange 10 #to 20##"
        onChange={onChange}
        columns={columns}
      />
    );

    const getBadgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            setPreservedSearchMode?: (
              value: EnhancedSearchState | null
            ) => void;
            setEditingBadge?: (
              value: {
                conditionIndex: number;
                field: 'value' | 'valueTo';
                value: string;
              } | null
            ) => void;
          }
        | undefined;
    const clearConditionPart = useBadgeHandlersMock.mock.results[0]?.value
      ?.clearConditionPart as ReturnType<typeof vi.fn>;

    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('noop');
    });

    act(() => {
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: '10',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('12');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #inRange 12 #to 20##',
        }),
      })
    );

    act(() => {
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'valueTo',
        value: '20',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('25');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #inRange 10 #to 25##',
        }),
      })
    );

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '10',
            valueTo: '20',
            operator: 'inRange',
            column: columns[1],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            isMultiColumn: true,
            joins: ['AND', 'AND'],
            joinOperator: 'AND',
            conditions: [
              {
                field: 'stock',
                operator: 'inRange',
                value: '10',
                valueTo: '20',
              },
              {
                field: 'name',
                operator: 'inRange',
                value: '30',
                valueTo: '40',
              },
              { field: 'stock', operator: 'equals', value: '5' },
            ],
          },
        }),
      });
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'valueTo',
        value: '20',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(20);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#stock #inRange 10##' }),
      })
    );

    act(() => {
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'value',
        value: '30',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearConditionPart).toHaveBeenCalledWith(1, 'value');

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '10',
            valueTo: '20',
            operator: 'inRange',
            column: columns[1],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            isMultiColumn: true,
            joins: ['AND'],
            joinOperator: 'AND',
            conditions: [
              {
                field: 'stock',
                operator: 'inRange',
                value: '10',
                valueTo: '20',
              },
              {
                field: 'name',
                operator: 'inRange',
                value: '30',
                valueTo: '40',
              },
            ],
          },
        }),
      });
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'valueTo',
        value: '40',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
      vi.advanceTimersByTime(20);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#name #inRange 30##'),
        }),
      })
    );

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '10',
            valueTo: '20',
            operator: 'inRange',
            column: columns[1],
            isExplicitOperator: true,
            isConfirmed: true,
            isMultiCondition: true,
            joins: ['AND'],
            joinOperator: 'AND',
            conditions: [
              {
                field: 'stock',
                operator: 'inRange',
                value: '10',
                valueTo: '20',
              },
              { field: 'name', operator: 'inRange', value: '' },
            ],
          },
        }),
      });
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'valueTo',
        value: '40',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearConditionPart).toHaveBeenCalledWith(1, 'valueTo');

    act(() => {
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 2,
        field: 'valueTo',
        value: '5',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearConditionPart).toHaveBeenCalledWith(2, 'valueTo');

    act(() => {
      getBadgeHookArgs()?.setPreservedSearchMode?.({
        ...baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '',
            valueTo: '20',
            operator: 'inRange',
            column: columns[1],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        }),
      });
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'valueTo',
        value: '20',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('');
    });
    expect(clearConditionPart).toHaveBeenCalledWith(0, 'valueTo');

    act(() => {
      getBadgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 1,
        field: 'value',
        value: 'x',
      });
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onInlineEditComplete as
          | ((value?: string) => void)
          | undefined
      )?.('30');
      vi.advanceTimersByTime(60);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#name #inRange 30'),
        }),
      })
    );
  });

  it('covers wrapped onChange fallback/reconstruction branches and step-back false path', () => {
    const onChange = vi.fn();

    let dynamicMode: EnhancedSearchState = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
        filterGroup: {
          kind: 'group',
          join: 'AND',
          nodes: [
            {
              kind: 'condition',
              field: 'name',
              column: columns[0],
              operator: 'contains',
              value: 'aspirin',
            },
          ],
        },
      },
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#( #name #contains aspirin #)##"
        onChange={onChange}
        columns={columns}
      />
    );

    const getKeyboardArgs = () =>
      useSearchKeyboardMock.mock.calls.at(-1)?.[0] as
        | {
            onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
            onStepBackDelete?: () => boolean;
          }
        | undefined;
    const getBadgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            preservedFilterRef?: {
              current: {
                conditions?: Array<{
                  field?: string;
                  operator?: string;
                  value?: string;
                  valueTo?: string;
                }>;
                joins?: string[];
                isMultiColumn?: boolean;
              } | null;
            };
          }
        | undefined;

    const groupedInput = document.createElement('input');
    groupedInput.value = 'next';
    getKeyboardArgs()?.onChange?.({
      target: groupedInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: groupedInput,
      })
    );

    dynamicMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
      },
    });
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains aspirin"
        onChange={onChange}
        columns={columns}
      />
    );

    if (getBadgeHookArgs()?.preservedFilterRef) {
      getBadgeHookArgs()!.preservedFilterRef!.current = {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          { operator: 'equals', value: '10' },
        ],
        joins: ['AND'],
      };
    }
    const hasJoinInput = document.createElement('input');
    hasJoinInput.value = '#name #contains aspirin #and #equals 77##';
    getKeyboardArgs()?.onChange?.({
      target: hasJoinInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: hasJoinInput,
      })
    );

    if (getBadgeHookArgs()?.preservedFilterRef) {
      getBadgeHookArgs()!.preservedFilterRef!.current = {
        conditions: [
          { field: 'name', operator: 'contains', value: 'aspirin' },
          {
            field: 'stock',
            operator: 'inRange',
            value: '10',
            valueTo: '20',
          },
        ],
        joins: ['AND'],
        isMultiColumn: true,
      };
    }
    const rebuildInput = document.createElement('input');
    rebuildInput.value = '500##';
    getKeyboardArgs()?.onChange?.({
      target: rebuildInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '500 #and #stock #inRange 10 #to 20##',
        }),
      })
    );

    if (getBadgeHookArgs()?.preservedFilterRef) {
      getBadgeHookArgs()!.preservedFilterRef!.current = null;
    }
    const plainInput = document.createElement('input');
    plainInput.value = 'plain update';
    getKeyboardArgs()?.onChange?.({
      target: plainInput,
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: plainInput,
      })
    );

    dynamicMode = baseSearchMode();
    view.rerender(
      <EnhancedSearchBar
        value="plain text"
        onChange={onChange}
        columns={columns}
      />
    );
    expect(getKeyboardArgs()?.onStepBackDelete?.()).toBe(false);
  });

  it('handles Ctrl+I focus restore for confirmed and unconfirmed preserved filters', () => {
    const onChange = vi.fn();
    render(
      <EnhancedSearchBar
        value="#name #contains aspirin##"
        onChange={onChange}
        columns={columns}
      />
    );

    const input = screen.getByRole('textbox');
    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        {
          type: 'value',
          canEdit: true,
          canClear: true,
          onEdit: vi.fn(),
          onClear: vi.fn(),
        },
      ]);
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(1);
    });

    const badgeHookArgs = useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.(
        baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        })
      );
    });
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: expect.stringContaining('#name #contains aspirin'),
        }),
      })
    );

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.(
        baseSearchMode({
          isFilterMode: true,
          filterSearch: {
            field: 'stock',
            value: '',
            operator: 'equals',
            column: columns[1],
            isExplicitOperator: false,
            isConfirmed: false,
          },
        })
      );
    });
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#stock #equals ',
        }),
      })
    );
  });

  it('uses empty column search term when pattern ends with group-open token', () => {
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
      }),
    });

    render(
      <EnhancedSearchBar value="#(" onChange={vi.fn()} columns={columns} />
    );

    expect(capturedColumnSelectorProps.current?.searchTerm).toBe('');
  });

  it('sorts columns from field fuzzy matches when header matches are absent', () => {
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
      }),
    });

    render(
      <EnhancedSearchBar
        value="#inventory"
        onChange={vi.fn()}
        columns={[
          columns[0],
          columns[1],
          {
            field: 'inventory_code',
            headerName: 'Acak',
            searchable: true,
            type: 'text',
          },
        ]}
      />
    );

    const sortedFields = (
      capturedColumnSelectorProps.current?.columns as
        | Array<{ field: string }>
        | undefined
    )?.map(col => col.field);
    expect(sortedFields?.[0]).toBe('inventory_code');
  });

  it('uses preserved selectedColumn fallback for default column index', () => {
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
      }),
    });

    render(
      <EnhancedSearchBar value="#" onChange={vi.fn()} columns={columns} />
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.(
        baseSearchMode({
          selectedColumn: columns[1],
        })
      );
    });

    expect(capturedColumnSelectorProps.current?.defaultSelectedIndex).toBe(1);
  });

  it('derives group-edit default indexes from active filterGroup state', () => {
    const onChange = vi.fn();
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showOperatorSelector: true,
        selectedColumn: columns[0],
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          operator: 'contains',
          column: columns[0],
          isExplicitOperator: true,
          filterGroup: {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'name',
                column: columns[0],
                operator: 'contains',
                value: 'aspirin',
              },
            ],
          },
        },
      }),
    });

    render(
      <EnhancedSearchBar value="#" onChange={onChange} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditColumn as
          | ((path: number[]) => void)
          | undefined
      )?.([0]);
    });
    expect(capturedColumnSelectorProps.current?.defaultSelectedIndex).toBe(0);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onGroupEditOperator as
          | ((path: number[]) => void)
          | undefined
      )?.([0]);
    });
    expect(capturedOperatorSelectorProps.current?.defaultSelectedIndex).toBe(0);
  });

  it('resolves condition-one selector anchors for create and edit states', () => {
    const onChange = vi.fn();
    const inputRef = React.createRef<HTMLInputElement>();
    const getLazyColumnRef = vi.fn(() => ({ current: null }));
    const getLazyOperatorRef = vi.fn(() => ({ current: null }));
    const getLazyJoinRef = vi.fn(() => ({ current: null }));

    let dynamicMode: EnhancedSearchState = baseSearchMode({
      showColumnSelector: true,
      showOperatorSelector: true,
      showJoinOperatorSelector: true,
      activeConditionIndex: 1,
      partialConditions: [
        {
          field: 'name',
          column: columns[0],
          operator: 'contains',
          value: 'asp',
        },
        { field: 'stock', column: columns[1], operator: 'equals', value: '' },
      ],
      selectedColumn: columns[1],
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));
    useSearchInputMock.mockReturnValue({
      displayValue: '#name #contains asp #and #',
      showTargetedIndicator: false,
      operatorSearchTerm: '',
      handleInputChange: vi.fn(),
      handleHoverChange: vi.fn(),
      setBadgeRef: vi.fn(),
      badgesContainerRef: { current: null },
      getLazyColumnRef,
      getLazyOperatorRef,
      getLazyJoinRef,
      getLazyBadgeRef: () => ({ current: null }),
    });

    render(
      <EnhancedSearchBar
        value="#name #contains asp #and #"
        onChange={onChange}
        columns={columns}
        inputRef={inputRef}
      />
    );

    expect(useSelectorPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        anchorRef: inputRef,
        anchorAlign: 'left',
      })
    );

    const badgeHookArgs = useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
      | {
          setPreservedSearchMode?: (value: EnhancedSearchState | null) => void;
          setEditingSelectorTarget?: (
            value: {
              conditionIndex: number;
              target: 'column' | 'operator' | 'join';
            } | null
          ) => void;
        }
      | undefined;

    act(() => {
      badgeHookArgs?.setPreservedSearchMode?.(
        baseSearchMode({
          showColumnSelector: true,
          showOperatorSelector: true,
          showJoinOperatorSelector: true,
          activeConditionIndex: 1,
          filterSearch: {
            field: 'name',
            value: 'asp',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        })
      );
      badgeHookArgs?.setEditingSelectorTarget?.({
        conditionIndex: 1,
        target: 'join',
      });
    });

    expect(getLazyColumnRef).toHaveBeenCalledWith(1);
    expect(getLazyOperatorRef).toHaveBeenCalledWith(1);
    expect(getLazyJoinRef).toHaveBeenCalledWith(1);
  });

  it('guards insert-condition flow for invalid states and out-of-range inserts', () => {
    const onChange = vi.fn();
    let dynamicMode: EnhancedSearchState = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: '',
        operator: '',
        column: columns[0],
        isExplicitOperator: false,
        isConfirmed: false,
      },
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#name #"
        onChange={onChange}
        columns={columns}
      />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(0);
    });
    expect(setFilterValueMock).not.toHaveBeenCalled();

    dynamicMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
        filterGroup: {
          kind: 'group',
          join: 'AND',
          nodes: [],
        },
      },
    });
    view.rerender(
      <EnhancedSearchBar
        value="#( #name #contains asp #)##"
        onChange={onChange}
        columns={columns}
      />
    );
    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(0);
    });
    expect(setFilterValueMock).not.toHaveBeenCalled();

    dynamicMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: '',
        column: columns[0],
        isExplicitOperator: false,
        isConfirmed: true,
      },
    });
    view.rerender(
      <EnhancedSearchBar
        value="#name #"
        onChange={onChange}
        columns={columns}
      />
    );
    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(0);
    });
    expect(setFilterValueMock).not.toHaveBeenCalled();

    dynamicMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: columns[0],
        isExplicitOperator: true,
        isConfirmed: true,
        isMultiCondition: true,
        joins: ['AND'],
        conditions: [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'stock', operator: 'equals', value: '10' },
        ],
      },
    });
    view.rerender(
      <EnhancedSearchBar
        value="#name #contains asp #and #stock #equals 10##"
        onChange={onChange}
        columns={columns}
      />
    );
    act(() => {
      (
        capturedSearchBadgeProps.current?.insertConditionAfter as
          | ((index: number) => void)
          | undefined
      )?.(1);
    });
    expect(setFilterValueMock).not.toHaveBeenCalled();
  });

  it('delegates column/operator/join selection to base handlers when not grouping', () => {
    const onChange = vi.fn();
    const handleColumnSelect = vi.fn();
    const handleOperatorSelect = vi.fn();
    const handleJoinOperatorSelect = vi.fn();

    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
        showOperatorSelector: true,
        showJoinOperatorSelector: true,
        selectedColumn: columns[0],
      }),
    });
    useSelectionHandlersMock.mockImplementation(
      (args: Record<string, unknown>) => {
        capturedSelectionHandlerArgs.current = args;
        return {
          handleColumnSelect,
          handleOperatorSelect,
          handleJoinOperatorSelect,
        };
      }
    );

    render(
      <EnhancedSearchBar value="#na" onChange={onChange} columns={columns} />
    );

    act(() => {
      (
        capturedColumnSelectorProps.current?.onSelect as
          | ((column: SearchColumn) => void)
          | undefined
      )?.(columns[1]);
      (
        capturedOperatorSelectorProps.current?.onSelect as
          | ((operator: FilterOperator) => void)
          | undefined
      )?.(makeOperator('equals'));
      (
        capturedJoinSelectorProps.current?.onSelect as
          | ((joinOp: { value: string }) => void)
          | undefined
      )?.({ value: 'or' });
    });

    expect(handleColumnSelect).toHaveBeenCalledWith(columns[1]);
    expect(handleOperatorSelect).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'equals' })
    );
    expect(handleJoinOperatorSelect).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'or' })
    );
  });

  it('updates selected badge index when badge count shrinks below current selection', () => {
    const onClear = vi.fn();

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(3);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        { type: 'value', canEdit: true, canClear: true, onClear: vi.fn() },
        { type: 'value', canEdit: true, canClear: true, onClear: vi.fn() },
        { type: 'value', canEdit: true, canClear: true, onClear },
      ]);
    });

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowLeft', ctrlKey: true });

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(0);
    });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });

    expect(onClear).not.toHaveBeenCalled();
  });

  it('covers badge edit wrapping and no-editable fallback branches', () => {
    const editFirst = vi.fn();
    const editLast = vi.fn();

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(2);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        { type: 'value', canEdit: true, onEdit: editFirst },
        { type: 'value', canEdit: true, onEdit: editLast },
      ]);
    });

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true, shiftKey: true });

    expect(editLast).toHaveBeenCalledTimes(1);
    expect(editFirst).toHaveBeenCalledTimes(1);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([
        { type: 'value', canEdit: false },
        { type: 'value', canEdit: false },
      ]);
    });
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true });
    expect(editFirst).toHaveBeenCalledTimes(1);
    expect(editLast).toHaveBeenCalledTimes(1);
  });

  it('returns badge navigation/delete guards for empty or non-clearable badge slots', () => {
    const keyboardSpy = vi.fn();
    useSearchKeyboardMock.mockReturnValue({
      handleInputKeyDown: keyboardSpy,
    });

    render(
      <EnhancedSearchBar value="asp" onChange={vi.fn()} columns={columns} />
    );
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    expect(keyboardSpy).toHaveBeenCalledTimes(1);

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(1);
    });
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });
  });

  it('restores preserved patterns through close handlers including operator fallback branch', () => {
    const onChange = vi.fn();
    let dynamicMode: EnhancedSearchState = baseSearchMode({
      showColumnSelector: true,
      showOperatorSelector: true,
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#name #contains aspirin##"
        onChange={onChange}
        columns={columns}
      />
    );

    const badgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            setPreservedSearchMode?: (
              value: EnhancedSearchState | null
            ) => void;
            setEditingSelectorTarget?: (
              value: {
                conditionIndex: number;
                target: 'column' | 'operator' | 'join';
              } | null
            ) => void;
          }
        | undefined;

    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        })
      );
    });
    act(() => {
      (
        capturedColumnSelectorProps.current?.onClose as (() => void) | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains aspirin##',
        }),
      })
    );

    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        })
      );
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name #contains aspirin##',
        }),
      })
    );

    dynamicMode = baseSearchMode({ showOperatorSelector: true });
    view.rerender(
      <EnhancedSearchBar
        value="#name #"
        onChange={onChange}
        columns={columns}
      />
    );
    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: '',
            column: columns[0],
            isExplicitOperator: false,
            isConfirmed: false,
          },
        })
      );
      badgeHookArgs()?.setEditingSelectorTarget?.({
        conditionIndex: 0,
        target: 'operator',
      });
    });
    act(() => {
      (
        capturedOperatorSelectorProps.current?.onClose as
          | (() => void)
          | undefined
      )?.();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '#name',
        }),
      })
    );
  });

  it('handles focus restoration from badge callback and Ctrl+I explicit/no-operator branches', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    let dynamicMode: EnhancedSearchState = baseSearchMode({
      showOperatorSelector: true,
    });
    useSearchStateMock.mockImplementation(() => ({ searchMode: dynamicMode }));

    const view = render(
      <EnhancedSearchBar
        value="#name #"
        onChange={onChange}
        columns={columns}
      />
    );
    const input = screen.getByRole('textbox');

    const badgeHookArgs = () =>
      useBadgeHandlersMock.mock.calls.at(-1)?.[0] as
        | {
            setPreservedSearchMode?: (
              value: EnhancedSearchState | null
            ) => void;
            setEditingBadge?: (
              value: {
                conditionIndex: number;
                field: 'value' | 'valueTo';
                value: string;
              } | null
            ) => void;
          }
        | undefined;

    act(() => {
      (
        capturedSearchBadgeProps.current?.onBadgeCountChange as
          | ((count: number) => void)
          | undefined
      )?.(1);
      (
        capturedSearchBadgeProps.current?.onBadgesChange as
          | ((badges: Array<Record<string, unknown>>) => void)
          | undefined
      )?.([{ type: 'value', canEdit: true, canClear: true }]);
      badgeHookArgs()?.setEditingBadge?.({
        conditionIndex: 0,
        field: 'value',
        value: 'asp',
      });
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: '',
            column: columns[0],
            isExplicitOperator: false,
            isConfirmed: false,
          },
        })
      );
    });
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onFocusInput as
          | (() => void)
          | undefined
      )?.();
      vi.advanceTimersByTime(70);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name ' }),
      })
    );
    onChange.mockClear();

    act(() => {
      badgeHookArgs()?.setEditingBadge?.(null);
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'aspirin',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: true,
          },
        })
      );
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onFocusInput as
          | (() => void)
          | undefined
      )?.();
      vi.advanceTimersByTime(70);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name #contains aspirin##' }),
      })
    );
    onChange.mockClear();

    act(() => {
      badgeHookArgs()?.setEditingBadge?.(null);
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: 'contains',
            column: columns[0],
            isExplicitOperator: false,
            isConfirmed: false,
          },
        })
      );
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onFocusInput as
          | (() => void)
          | undefined
      )?.();
      vi.advanceTimersByTime(70);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name #contains ' }),
      })
    );
    onChange.mockClear();

    act(() => {
      badgeHookArgs()?.setEditingBadge?.(null);
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: 'equals',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: false,
          },
        })
      );
    });
    act(() => {
      (
        capturedSearchBadgeProps.current?.onFocusInput as
          | (() => void)
          | undefined
      )?.();
      vi.advanceTimersByTime(70);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name #equals ' }),
      })
    );

    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: 'equals',
            column: columns[0],
            isExplicitOperator: true,
            isConfirmed: false,
          },
        })
      );
    });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name #equals ' }),
      })
    );

    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(
        baseSearchMode({
          filterSearch: {
            field: 'name',
            value: '',
            operator: '',
            column: columns[0],
            isExplicitOperator: false,
            isConfirmed: false,
          },
        })
      );
    });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '#name ' }),
      })
    );

    dynamicMode = baseSearchMode({ showOperatorSelector: true });
    view.rerender(
      <EnhancedSearchBar value="plain" onChange={onChange} columns={columns} />
    );
    act(() => {
      badgeHookArgs()?.setPreservedSearchMode?.(null);
    });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '' }),
      })
    );
  });

  it('sorts multiple fuzzy column matches to exercise score comparator path', () => {
    useSearchStateMock.mockReturnValue({
      searchMode: baseSearchMode({
        showColumnSelector: true,
      }),
    });

    render(
      <EnhancedSearchBar
        value="#na"
        onChange={vi.fn()}
        columns={[
          columns[1],
          columns[0],
          {
            field: 'name_alias',
            headerName: 'Nama Alias',
            searchable: true,
            type: 'text',
          },
        ]}
      />
    );

    const sortedFields = (
      capturedColumnSelectorProps.current?.columns as
        | Array<{ field: string }>
        | undefined
    )?.map(col => col.field);
    expect(sortedFields?.length).toBeGreaterThan(1);
  });
});
