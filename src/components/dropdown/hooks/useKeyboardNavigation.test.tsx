import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const createVirtualizedOptionFrame = (index: number, offsetTop: number) => {
    const frame = document.createElement('div');
    frame.setAttribute('data-dropdown-option-frame', '');
    frame.setAttribute('data-dropdown-option-index', String(index));
    Object.defineProperties(frame, {
      offsetTop: { configurable: true, value: offsetTop },
      offsetHeight: { configurable: true, value: 40 },
    });

    const option = document.createElement('button');
    option.setAttribute('role', 'option');
    option.setAttribute('data-dropdown-option-index', String(index));
    frame.appendChild(option);

    return frame;
  };

  it('restores the selected option highlight when search is cleared', () => {
    const optionsContainerRef = { current: document.createElement('div') };
    const setExpandedId = vi.fn();
    const baseProps = {
      isOpen: true,
      value: 'mukolitik',
      setExpandedId,
      searchState: 'found',
      onSelect: vi.fn(),
      onCloseDropdown: vi.fn(),
      onCloseValidation: vi.fn(),
      autoHighlightOnOpen: true,
      optionsContainerRef,
    };

    const { result, rerender } = renderHook(
      props => useKeyboardNavigation(props),
      {
        initialProps: {
          ...baseProps,
          currentFilteredOptions: [{ id: 'otologi', name: 'Otologi' }],
          searchTerm: 'oto',
          debouncedSearchTerm: 'oto',
        },
      }
    );

    expect(result.current.highlightedIndex).toBe(0);

    rerender({
      ...baseProps,
      currentFilteredOptions: [{ id: 'otologi', name: 'Otologi' }],
      searchTerm: '',
      debouncedSearchTerm: 'oto',
    });

    expect(result.current.highlightedIndex).toBe(0);

    rerender({
      ...baseProps,
      currentFilteredOptions: [
        { id: 'otologi', name: 'Otologi' },
        { id: 'mukolitik', name: 'Mukolitik' },
      ],
      searchTerm: '',
      debouncedSearchTerm: '',
    });

    expect(result.current.highlightedIndex).toBe(1);
  });

  it('does not pin keyboard navigation for a visible virtualized option', () => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      clientHeight: { value: 120 },
      scrollHeight: { value: 400 },
    });
    container.scrollTop = 180;
    container.appendChild(createVirtualizedOptionFrame(6, 216));

    const optionsContainerRef = { current: container };
    const setExpandedId = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        value: 'item-5',
        currentFilteredOptions: Array.from({ length: 10 }, (_, index) => ({
          id: `item-${index}`,
          name: `Item ${index}`,
        })),
        setExpandedId,
        searchState: 'idle',
        searchTerm: '',
        debouncedSearchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        autoHighlightOnOpen: false,
        optionsContainerRef,
      })
    );

    act(() => {
      result.current.handleDropdownKeyDown({
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      } as never);
    });

    expect(result.current.highlightedIndex).toBe(6);
    expect(result.current.pendingHighlightedIndex).toBeNull();
  });
});
