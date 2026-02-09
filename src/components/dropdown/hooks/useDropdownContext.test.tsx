import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DropdownProvider } from '../providers/DropdownContext';
import type { DropdownContextType } from '../types';
import { useDropdownContext } from './useDropdownContext';

const createContextValue = (): DropdownContextType => ({
  isOpen: true,
  isClosing: false,
  applyOpenStyles: true,
  value: 'option-1',
  withRadio: false,
  withCheckbox: false,
  searchList: true,
  searchTerm: 'opt',
  searchState: 'typing',
  filteredOptions: [{ id: 'option-1', name: 'Option 1' }],
  highlightedIndex: 0,
  isKeyboardNavigation: false,
  expandedId: null,
  hasError: false,
  scrollState: {
    isScrollable: true,
    reachedBottom: false,
    scrolledFromTop: true,
  },
  dropDirection: 'down',
  portalStyle: {},
  isPositionReady: true,
  buttonRef: React.createRef<HTMLButtonElement>(),
  dropdownMenuRef: React.createRef<HTMLDivElement>(),
  searchInputRef: React.createRef<HTMLInputElement>(),
  optionsContainerRef: React.createRef<HTMLDivElement>(),
  onSelect: vi.fn(),
  onSearchChange: vi.fn(),
  onKeyDown: vi.fn(),
  onSetHighlightedIndex: vi.fn(),
  onSetIsKeyboardNavigation: vi.fn(),
  onMenuEnter: vi.fn(),
  onMenuLeave: vi.fn(),
  onScroll: vi.fn(),
});

describe('useDropdownContext', () => {
  it('returns dropdown context when provider exists', () => {
    const contextValue = createContextValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DropdownProvider value={contextValue}>{children}</DropdownProvider>
    );

    const { result } = renderHook(() => useDropdownContext(), { wrapper });

    expect(result.current).toBe(contextValue);
    expect(result.current.dropDirection).toBe('down');
  });

  it('throws an error when used outside DropdownProvider', () => {
    expect(() => renderHook(() => useDropdownContext())).toThrowError(
      'useDropdownContext must be used within a DropdownProvider'
    );
  });
});
