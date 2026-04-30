import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
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
});
