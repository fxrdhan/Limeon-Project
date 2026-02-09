import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DropdownMenu from './DropdownMenu';

const useDropdownContextMock = vi.hoisted(() => vi.fn());
const searchBarMock = vi.hoisted(() => vi.fn());
const optionItemMock = vi.hoisted(() => vi.fn());
const emptyStateMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useDropdownContext', () => ({
  useDropdownContext: useDropdownContextMock,
}));

vi.mock('./menu/MenuPortal', () => ({
  default: React.forwardRef((props: Record<string, unknown>, ref) => (
    <div data-testid="menu-portal" ref={ref as React.Ref<HTMLDivElement>}>
      {props.children as React.ReactNode}
    </div>
  )),
}));

vi.mock('./SearchBar', () => ({
  default: React.forwardRef((props: Record<string, unknown>, ref) => {
    searchBarMock(props);
    return (
      <input
        data-testid="search-bar"
        ref={ref as React.Ref<HTMLInputElement>}
      />
    );
  }),
}));

vi.mock('./menu/MenuContent', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="menu-content">{children}</div>
  ),
}));

vi.mock('./OptionItem', () => ({
  default: (props: Record<string, unknown>) => {
    optionItemMock(props);
    return (
      <button
        type="button"
        data-testid={`option-${String(props.index)}`}
        onMouseEnter={() =>
          (props.onHighlight as (index: number) => void)(props.index as number)
        }
      >
        {String((props.option as { name: string }).name)}
      </button>
    );
  },
}));

vi.mock('./menu/EmptyState', () => ({
  default: (props: Record<string, unknown>) => {
    emptyStateMock(props);
    return <div data-testid="empty-state">empty</div>;
  },
}));

describe('DropdownMenu', () => {
  beforeEach(() => {
    useDropdownContextMock.mockReset();
    searchBarMock.mockReset();
    optionItemMock.mockReset();
    emptyStateMock.mockReset();
  });

  it('renders search bar and maps options with checkbox selection state', () => {
    const onSetHighlightedIndex = vi.fn();
    const onSetIsKeyboardNavigation = vi.fn();
    const onKeyDown = vi.fn();

    useDropdownContextMock.mockReturnValue({
      isOpen: true,
      isClosing: false,
      applyOpenStyles: true,
      dropDirection: 'down',
      portalStyle: { left: '0px' },
      isPositionReady: true,
      isKeyboardNavigation: false,
      searchList: true,
      searchTerm: 'item',
      searchState: 'found',
      filteredOptions: [
        { id: '1', name: 'Paracetamol' },
        { id: '2', name: 'Amoxicillin' },
      ],
      highlightedIndex: 1,
      expandedId: '2',
      value: ['2'],
      withCheckbox: true,
      onAddNew: vi.fn(),
      onKeyDown,
      onSetHighlightedIndex,
      onSetIsKeyboardNavigation,
      onMenuEnter: vi.fn(),
      onMenuLeave: vi.fn(),
      onScroll: vi.fn(),
      searchInputRef: { current: null },
      optionsContainerRef: { current: null },
      scrollState: {
        isScrollable: false,
        reachedBottom: false,
        scrolledFromTop: false,
      },
    });

    render(
      <DropdownMenu
        ref={React.createRef<HTMLDivElement>()}
        leaveTimeoutRef={{ current: null }}
        onSearchKeyDown={vi.fn()}
      />
    );

    expect(screen.getByTestId('menu-portal')).toBeInTheDocument();
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(optionItemMock).toHaveBeenCalledTimes(2);
    expect(optionItemMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        isSelected: false,
        isHighlighted: false,
        isExpanded: false,
      })
    );
    expect(optionItemMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        isSelected: true,
        isHighlighted: true,
        isExpanded: true,
      })
    );

    fireEvent.mouseEnter(screen.getByTestId('option-0'));
    expect(onSetIsKeyboardNavigation).toHaveBeenCalledWith(false);
    expect(onSetHighlightedIndex).toHaveBeenCalledWith(0);

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('shows empty state and binds menu keydown when search is disabled', () => {
    const onKeyDown = vi.fn();

    useDropdownContextMock.mockReturnValue({
      isOpen: true,
      isClosing: false,
      applyOpenStyles: true,
      dropDirection: 'down',
      portalStyle: { left: '0px' },
      isPositionReady: true,
      isKeyboardNavigation: false,
      searchList: false,
      searchTerm: 'none',
      searchState: 'not-found',
      filteredOptions: [],
      highlightedIndex: -1,
      expandedId: null,
      value: '',
      withCheckbox: false,
      onAddNew: vi.fn(),
      onKeyDown,
      onSetHighlightedIndex: vi.fn(),
      onSetIsKeyboardNavigation: vi.fn(),
      onMenuEnter: vi.fn(),
      onMenuLeave: vi.fn(),
      onScroll: vi.fn(),
      searchInputRef: { current: null },
      optionsContainerRef: { current: null },
      scrollState: {
        isScrollable: false,
        reachedBottom: false,
        scrolledFromTop: false,
      },
    });

    render(
      <DropdownMenu
        ref={React.createRef<HTMLDivElement>()}
        leaveTimeoutRef={{ current: null }}
        onSearchKeyDown={vi.fn()}
      />
    );

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(emptyStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchState: 'not-found',
        searchTerm: 'none',
        hasAddNew: true,
      })
    );

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
