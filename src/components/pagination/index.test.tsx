import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Pagination from './index';

const usePaginationStateMock = vi.hoisted(() => vi.fn());
const useFloatingPaginationMock = vi.hoisted(() => vi.fn());
const useKeyboardNavigationMock = vi.hoisted(() => vi.fn());
const useAnimationDirectionMock = vi.hoisted(() => vi.fn());

const paginationContentMock = vi.hoisted(() => vi.fn());
const floatingWrapperMock = vi.hoisted(() => vi.fn());
const paginationProviderMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  usePaginationState: usePaginationStateMock,
  useFloatingPagination: useFloatingPaginationMock,
  useKeyboardNavigation: useKeyboardNavigationMock,
  useAnimationDirection: useAnimationDirectionMock,
}));

vi.mock('./providers', () => ({
  PaginationProvider: ({
    value,
    children,
  }: {
    value: unknown;
    children: React.ReactNode;
  }) => {
    paginationProviderMock(value);
    return <div data-testid="pagination-provider">{children}</div>;
  },
}));

vi.mock('./components', () => ({
  PaginationContent: ({ isFloating = false }: { isFloating?: boolean }) => {
    paginationContentMock({ isFloating });
    return (
      <div data-testid={isFloating ? 'floating-content' : 'main-content'} />
    );
  },
  FloatingWrapper: ({
    show,
    hideWhenModalOpen,
    children,
  }: {
    show: boolean;
    hideWhenModalOpen: boolean;
    children: React.ReactNode;
  }) => {
    floatingWrapperMock({ show, hideWhenModalOpen });
    return <div data-testid="floating-wrapper">{children}</div>;
  },
}));

describe('Pagination index', () => {
  const onPageChange = vi.fn();
  const onItemsPerPageChange = vi.fn();

  beforeEach(() => {
    onPageChange.mockReset();
    onItemsPerPageChange.mockReset();

    usePaginationStateMock.mockReset();
    useFloatingPaginationMock.mockReset();
    useKeyboardNavigationMock.mockReset();
    useAnimationDirectionMock.mockReset();

    paginationContentMock.mockReset();
    floatingWrapperMock.mockReset();
    paginationProviderMock.mockReset();

    usePaginationStateMock.mockReturnValue({
      currentPage: 2,
      totalPages: 9,
      itemsPerPage: 10,
      onPageChange,
      onItemsPerPageChange,
      handleItemsPerPageClick: vi.fn(),
      selectedPageSizeIndex: 2,
      pageSizes: [10, 20, 50],
    });

    useFloatingPaginationMock.mockReturnValue({
      showFloating: true,
    });

    useAnimationDirectionMock.mockReturnValue({
      direction: -1,
    });
  });

  it('wires hooks/provider/content and syncs selected index from state', async () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={9}
        itemsPerPage={10}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
        hideFloatingWhenModalOpen={false}
      />
    );

    expect(screen.getByTestId('pagination-provider')).toBeInTheDocument();
    expect(usePaginationStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2,
        totalPages: 9,
        itemsPerPage: 10,
      })
    );

    expect(useFloatingPaginationMock).toHaveBeenCalledWith(
      expect.objectContaining({ enableFloating: true })
    );

    await waitFor(() => {
      const calls = useKeyboardNavigationMock.mock.calls;
      expect(calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          showFloating: true,
          selectedPageSizeIndex: 2,
          currentPage: 2,
          totalPages: 9,
        })
      );
    });

    expect(paginationProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showFloating: true,
        direction: -1,
        selectedPageSizeIndex: 2,
      })
    );

    expect(paginationContentMock).toHaveBeenCalledWith({ isFloating: false });
    expect(paginationContentMock).toHaveBeenCalledWith({ isFloating: true });

    expect(floatingWrapperMock).toHaveBeenCalledWith({
      show: true,
      hideWhenModalOpen: false,
    });

    expect(screen.getByTestId('floating-wrapper')).toBeInTheDocument();
  });

  it('hides floating wrapper when floating feature is disabled', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        itemsPerPage={10}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
        enableFloating={false}
      />
    );

    expect(floatingWrapperMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('floating-wrapper')).not.toBeInTheDocument();
  });

  it('uses visible container styles when floating should not hide main content', () => {
    useFloatingPaginationMock.mockReturnValue({ showFloating: false });

    const { container } = render(
      <Pagination
        currentPage={3}
        totalPages={10}
        itemsPerPage={20}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
        hideFloatingWhenModalOpen
      />
    );

    const host = container.querySelector('div.transition-opacity.duration-200');
    expect(host).toHaveClass('opacity-100');
    expect(host).not.toHaveClass('pointer-events-none');

    expect(floatingWrapperMock).toHaveBeenCalledWith({
      show: false,
      hideWhenModalOpen: true,
    });
  });
});
