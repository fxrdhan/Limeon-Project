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
  default: () => <div data-testid="search-icon" />,
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
    capturedSearchBadgeProps.current = null;
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
});
