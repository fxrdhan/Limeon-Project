import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePaginationContext } from './usePaginationContext';
import { PaginationProvider } from '../providers';

describe('usePaginationContext', () => {
  it('throws when used outside PaginationProvider', () => {
    expect(() => renderHook(() => usePaginationContext())).toThrow(
      'usePaginationContext must be used within a PaginationProvider'
    );
  });

  it('returns context value when used inside PaginationProvider', () => {
    const contextValue = {
      currentPage: 2,
      totalPages: 5,
      itemsPerPage: 10,
      onPageChange: vi.fn(),
      onItemsPerPageChange: vi.fn(),
      handleItemsPerPageClick: vi.fn(),
      pageSizes: [10, 20],
      selectedPageSizeIndex: 0,
      showFloating: false,
      direction: 1,
      enableFloating: true,
      hideFloatingWhenModalOpen: false,
      className: 'x',
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PaginationProvider value={contextValue as never}>
        {children}
      </PaginationProvider>
    );

    const { result } = renderHook(() => usePaginationContext(), { wrapper });
    expect(result.current).toEqual(contextValue);
  });
});
