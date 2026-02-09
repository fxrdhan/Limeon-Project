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
    useSelectionHandlersMock.mockReturnValue({
      handleColumnSelect: vi.fn(),
      handleOperatorSelect: vi.fn(),
      handleJoinOperatorSelect: vi.fn(),
    });
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
});
