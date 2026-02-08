import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaginationState } from './usePaginationState';
import { useFloatingPagination } from './useFloatingPagination';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useAnimationDirection } from './useAnimationDirection';

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    IntersectionObserverMock.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}

describe('pagination hooks', () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock as never);
  });

  it('derives pagination state and handles page-size click actions', () => {
    const onPageChange = vi.fn();
    const onItemsPerPageChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ itemsPerPage }) =>
        usePaginationState({
          currentPage: 2,
          totalPages: 8,
          itemsPerPage,
          onPageChange,
          onItemsPerPageChange,
        }),
      { initialProps: { itemsPerPage: 10 } }
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.totalPages).toBe(8);
    expect(result.current.selectedPageSizeIndex).toBe(0);

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleItemsPerPageClick(20, event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(onItemsPerPageChange).toHaveBeenCalledWith({
      target: { value: '20' },
    });

    onItemsPerPageChange.mockReset();
    act(() => {
      result.current.handleItemsPerPageClick(10, event);
    });
    expect(onItemsPerPageChange).not.toHaveBeenCalled();

    rerender({ itemsPerPage: 999 });
    expect(result.current.selectedPageSizeIndex).toBe(0);
  });

  it('observes pagination container and toggles floating visibility', async () => {
    const containerRef = {
      current: document.createElement('div'),
    } as React.RefObject<HTMLDivElement>;

    const { result, unmount } = renderHook(() =>
      useFloatingPagination({ enableFloating: true, containerRef })
    );

    expect(IntersectionObserverMock.instances).toHaveLength(1);
    const observer = IntersectionObserverMock.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(containerRef.current);

    act(() => {
      observer.trigger(false);
    });

    await waitFor(() => {
      expect(result.current.showFloating).toBe(true);
    });

    act(() => {
      result.current.setShowFloating(false);
    });
    expect(result.current.showFloating).toBe(false);

    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('skips observer when floating is disabled or ref missing', () => {
    const { result: disabled } = renderHook(() =>
      useFloatingPagination({
        enableFloating: false,
        containerRef: { current: document.createElement('div') },
      })
    );
    expect(disabled.current.showFloating).toBe(false);

    renderHook(() =>
      useFloatingPagination({
        enableFloating: true,
        containerRef: { current: null },
      })
    );

    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });

  it('handles keyboard navigation for floating pagination', () => {
    const onItemsPerPageChange = vi.fn();
    const onPageChange = vi.fn();
    const setSelectedPageSizeIndex = vi.fn();

    const { unmount } = renderHook(() =>
      useKeyboardNavigation({
        showFloating: true,
        hideFloatingWhenModalOpen: false,
        selectedPageSizeIndex: 0,
        pageSizes: [10, 20],
        currentPage: 2,
        totalPages: 5,
        onItemsPerPageChange,
        onPageChange,
        setSelectedPageSizeIndex,
      })
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(setSelectedPageSizeIndex).toHaveBeenCalledWith(1);
    expect(onItemsPerPageChange).toHaveBeenCalledWith({
      target: { value: '20' },
    });

    setSelectedPageSizeIndex.mockReset();
    onItemsPerPageChange.mockReset();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown' })
      );
    });
    expect(setSelectedPageSizeIndex).toHaveBeenCalledWith(1);
    expect(onItemsPerPageChange).toHaveBeenCalledWith({
      target: { value: '20' },
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' })
      );
    });
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);

    unmount();
  });

  it('ignores keyboard navigation when floating is hidden/modal open', () => {
    const onItemsPerPageChange = vi.fn();
    const onPageChange = vi.fn();
    const setSelectedPageSizeIndex = vi.fn();

    renderHook(() =>
      useKeyboardNavigation({
        showFloating: false,
        hideFloatingWhenModalOpen: false,
        selectedPageSizeIndex: 1,
        pageSizes: [10, 20],
        currentPage: 1,
        totalPages: 0,
        onItemsPerPageChange,
        onPageChange,
        setSelectedPageSizeIndex,
      })
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' })
      );
    });
    expect(onPageChange).not.toHaveBeenCalled();

    const { rerender } = renderHook(
      ({ hideFloatingWhenModalOpen }) =>
        useKeyboardNavigation({
          showFloating: true,
          hideFloatingWhenModalOpen,
          selectedPageSizeIndex: 1,
          pageSizes: [10, 20],
          currentPage: 1,
          totalPages: 0,
          onItemsPerPageChange,
          onPageChange,
          setSelectedPageSizeIndex,
        }),
      { initialProps: { hideFloatingWhenModalOpen: true } }
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(onItemsPerPageChange).not.toHaveBeenCalled();

    rerender({ hideFloatingWhenModalOpen: false });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' })
      );
    });
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('derives animation direction and exposes motion variants', () => {
    const { result, rerender } = renderHook(
      ({ currentPage }) => useAnimationDirection({ currentPage }),
      { initialProps: { currentPage: 1 } }
    );

    expect(result.current.direction).toBe(0);
    expect(result.current.variants.enter(1).opacity).toBe(0);
    expect(result.current.variants.exit(1).opacity).toBe(0);
    expect(result.current.floatingVariants.initial.scale).toBeLessThan(1);

    rerender({ currentPage: 3 });
    expect(result.current.direction).toBe(1);

    rerender({ currentPage: 2 });
    expect(result.current.direction).toBe(-1);
  });
});
