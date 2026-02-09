import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar';

const useDropdownContextMock = vi.hoisted(() => vi.fn());
const searchInputMock = vi.hoisted(() => vi.fn());
const searchIconMock = vi.hoisted(() => vi.fn());
const addNewButtonMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useDropdownContext', () => ({
  useDropdownContext: useDropdownContextMock,
}));

vi.mock('./search/SearchInput', () => ({
  default: React.forwardRef((props: Record<string, unknown>, ref) => {
    searchInputMock(props);
    return (
      <input
        data-testid="search-input"
        ref={ref as React.Ref<HTMLInputElement>}
      />
    );
  }),
}));

vi.mock('./search/SearchIcon', () => ({
  default: (props: Record<string, unknown>) => {
    searchIconMock(props);
    return (
      <div
        data-testid={`search-icon-${String(props.position ?? 'absolute')}`}
      />
    );
  },
}));

vi.mock('./search/AddNewButton', () => ({
  default: (props: Record<string, unknown>) => {
    addNewButtonMock(props);
    return <button data-testid="add-new-button">Add</button>;
  },
}));

describe('SearchBar', () => {
  beforeEach(() => {
    useDropdownContextMock.mockReset();
    searchInputMock.mockReset();
    searchIconMock.mockReset();
    addNewButtonMock.mockReset();
  });

  it('shows AddNewButton when term has no results and add-new handler exists', () => {
    const onAddNew = vi.fn();
    const onSearchChange = vi.fn();

    useDropdownContextMock.mockReturnValue({
      searchTerm: 'new item',
      searchState: 'not-found',
      isOpen: true,
      highlightedIndex: 0,
      filteredOptions: [],
      onAddNew,
      onSearchChange,
    });

    const leaveTimeoutRef = {
      current: null,
    } as React.RefObject<NodeJS.Timeout | null>;

    render(
      <SearchBar
        ref={React.createRef<HTMLInputElement>()}
        onKeyDown={vi.fn()}
        onFocus={vi.fn()}
        leaveTimeoutRef={leaveTimeoutRef}
      />
    );

    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('add-new-button')).toBeInTheDocument();
    expect(searchInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'new item',
        searchState: 'not-found',
        currentFilteredOptions: [],
      })
    );
    expect(addNewButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'new item',
        searchState: 'not-found',
        onAddNew: expect.any(Function),
      })
    );
  });

  it('shows relative search icon for typed term when add-new is not shown', () => {
    useDropdownContextMock.mockReturnValue({
      searchTerm: 'para',
      searchState: 'found',
      isOpen: true,
      highlightedIndex: 0,
      filteredOptions: [{ id: '1', name: 'Paracetamol' }],
      onAddNew: undefined,
      onSearchChange: vi.fn(),
    });

    render(
      <SearchBar
        ref={React.createRef<HTMLInputElement>()}
        onKeyDown={vi.fn()}
        onFocus={vi.fn()}
        leaveTimeoutRef={{ current: null }}
      />
    );

    expect(screen.getByTestId('search-icon-relative')).toBeInTheDocument();
    expect(addNewButtonMock).not.toHaveBeenCalled();
  });

  it('does not show trailing area when search term is empty', () => {
    useDropdownContextMock.mockReturnValue({
      searchTerm: '',
      searchState: 'idle',
      isOpen: true,
      highlightedIndex: -1,
      filteredOptions: [{ id: '1', name: 'Paracetamol' }],
      onAddNew: vi.fn(),
      onSearchChange: vi.fn(),
    });

    render(
      <SearchBar
        ref={React.createRef<HTMLInputElement>()}
        onKeyDown={vi.fn()}
        onFocus={vi.fn()}
        leaveTimeoutRef={{ current: null }}
      />
    );

    expect(
      screen.queryByTestId('search-icon-relative')
    ).not.toBeInTheDocument();
    expect(addNewButtonMock).not.toHaveBeenCalled();
  });
});
