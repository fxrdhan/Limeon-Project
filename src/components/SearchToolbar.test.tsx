import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchToolbar from './SearchToolbar';

type EnhancedSearchBarMockProps = {
  value: string;
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

type ExportDropdownMockProps = {
  filename?: string;
  gridApi?: unknown;
};

const latestSearchBarProps = vi.hoisted(() => ({
  current: null as EnhancedSearchBarMockProps | null,
}));
const exportDropdownPropsMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/search-bar/EnhancedSearchBar', () => ({
  default: (props: EnhancedSearchBarMockProps) => {
    latestSearchBarProps.current = props;
    return (
      <input
        data-testid="enhanced-search-input"
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
    );
  },
}));

vi.mock('@/components/export', () => ({
  ExportDropdown: (props: ExportDropdownMockProps) => {
    exportDropdownPropsMock(props);
    return <div data-testid="export-dropdown" />;
  },
}));

describe('SearchToolbar', () => {
  beforeEach(() => {
    latestSearchBarProps.current = null;
    exportDropdownPropsMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const baseProps = () => ({
    searchInputRef: { current: document.createElement('input') },
    searchBarProps: {
      value: '',
      onChange: vi.fn(),
      onGlobalSearch: vi.fn(),
      onClearSearch: vi.fn(),
      onFilterSearch: vi.fn(),
      searchState: 'idle' as const,
      columns: [],
      placeholder: 'Cari Item',
    },
    search: '',
    placeholder: 'Placeholder custom',
    onAdd: vi.fn(),
  });

  it('renders search input/add/export and uses default export filename', () => {
    const props = baseProps();

    render(<SearchToolbar {...props} />);

    expect(screen.getByTestId('enhanced-search-input')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Placeholder custom')
    ).toBeInTheDocument();
    expect(screen.getByTestId('export-dropdown')).toBeInTheDocument();

    expect(exportDropdownPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'data-export',
        gridApi: null,
      })
    );

    fireEvent.click(screen.getByTitle('Tambah Item Baru'));
    expect(props.onAdd).toHaveBeenCalledTimes(1);
  });

  it('handles tab and shift+tab navigation with delayed refocus', () => {
    const props = {
      ...baseProps(),
      onTabNext: vi.fn(),
      onTabPrevious: vi.fn(),
    };

    const focusSpy = vi.spyOn(props.searchInputRef.current!, 'focus');

    render(<SearchToolbar {...props} />);

    const tabEvent = {
      key: 'Tab',
      repeat: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      latestSearchBarProps.current.onKeyDown(tabEvent);
      vi.runAllTimers();
    });

    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(tabEvent.stopPropagation).toHaveBeenCalled();
    expect(props.onTabNext).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalled();

    const shiftTabEvent = {
      key: 'Tab',
      repeat: false,
      shiftKey: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      latestSearchBarProps.current.onKeyDown(shiftTabEvent);
      vi.runAllTimers();
    });

    expect(props.onTabPrevious).toHaveBeenCalledTimes(1);
  });

  it('blocks repeated tab presses and delegates custom onKeyDown when provided', () => {
    const customOnKeyDown = vi.fn();
    const props = {
      ...baseProps(),
      onKeyDown: customOnKeyDown,
      onTabNext: vi.fn(),
    };

    render(<SearchToolbar {...props} />);

    const repeatedTabEvent = {
      key: 'Tab',
      repeat: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      latestSearchBarProps.current.onKeyDown(repeatedTabEvent);
    });

    expect(repeatedTabEvent.preventDefault).toHaveBeenCalled();
    expect(props.onTabNext).not.toHaveBeenCalled();

    const plainEvent = {
      key: 'x',
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      latestSearchBarProps.current.onKeyDown(plainEvent);
    });

    expect(customOnKeyDown).toHaveBeenCalledWith(plainEvent);
  });

  it('handles enter behavior for item select/add and ignores targeted search syntax', () => {
    const onItemSelect = vi.fn();
    const firstItem = { id: 'itm-1', name: 'Paracetamol' };

    const props = {
      ...baseProps(),
      items: [firstItem],
      onItemSelect,
      search: 'para',
    };

    render(<SearchToolbar {...props} />);

    const enterEvent = {
      key: 'Enter',
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      latestSearchBarProps.current.onKeyDown(enterEvent);
    });

    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(onItemSelect).toHaveBeenCalledWith(firstItem);

    onItemSelect.mockReset();
    props.onAdd.mockReset();

    const rerenderProps = {
      ...baseProps(),
      items: [],
      onItemSelect,
      search: 'keyword',
    };

    const { rerender } = render(<SearchToolbar {...rerenderProps} />);

    act(() => {
      latestSearchBarProps.current.onKeyDown(enterEvent);
    });
    expect(rerenderProps.onAdd).toHaveBeenCalledTimes(1);

    rerender(
      <SearchToolbar
        {...rerenderProps}
        searchBarProps={{
          ...rerenderProps.searchBarProps,
          value: '#nama=parasetamol',
        }}
      />
    );

    rerenderProps.onAdd.mockReset();
    onItemSelect.mockReset();

    act(() => {
      latestSearchBarProps.current.onKeyDown(enterEvent);
    });

    expect(onItemSelect).not.toHaveBeenCalled();
    expect(rerenderProps.onAdd).not.toHaveBeenCalled();
  });
});
