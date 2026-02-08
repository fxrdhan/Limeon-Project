import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AGGridPagination from './AGGridPagination';

const floatingStateStore = vi.hoisted(() => ({
  showFloating: false,
}));

const animationStateStore = vi.hoisted(() => ({
  direction: 'next' as 'next' | 'prev' | null,
}));

const contextStore = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

const floatingWrapperStore = vi.hoisted(() => ({
  calls: [] as Array<{ show: boolean; hideWhenModalOpen: boolean }>,
}));

vi.mock('./hooks', () => ({
  useFloatingPagination: () => floatingStateStore,
  useAnimationDirection: () => animationStateStore,
}));

vi.mock('./providers', () => ({
  PaginationProvider: ({
    value,
    children,
  }: {
    value: Record<string, unknown>;
    children: ReactNode;
  }) => {
    contextStore.current = value;
    return <div data-testid="pagination-provider">{children}</div>;
  },
}));

vi.mock('./components', () => ({
  PaginationContent: ({ isFloating }: { isFloating?: boolean }) => (
    <div
      data-testid={isFloating ? 'pagination-floating' : 'pagination-content'}
    />
  ),
  FloatingWrapper: ({
    show,
    hideWhenModalOpen,
    children,
  }: {
    show: boolean;
    hideWhenModalOpen: boolean;
    children: ReactNode;
  }) => {
    floatingWrapperStore.calls.push({ show, hideWhenModalOpen });
    return <div data-testid="floating-wrapper">{children}</div>;
  },
}));

type GridApiState = {
  pagination: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  destroyed: boolean;
  listeners: Record<string, ((...args: unknown[]) => void) | undefined>;
};

const createGridApi = (overrides: Partial<GridApiState> = {}) => {
  const state: GridApiState = {
    pagination: true,
    currentPage: 2,
    totalPages: 5,
    pageSize: 25,
    destroyed: false,
    listeners: {},
    ...overrides,
  };

  const api = {
    isDestroyed: vi.fn(() => state.destroyed),
    getGridOption: vi.fn((key: string) => {
      if (key === 'pagination') return state.pagination;
      return undefined;
    }),
    paginationGetCurrentPage: vi.fn(() => state.currentPage - 1),
    paginationGetTotalPages: vi.fn(() => state.totalPages),
    paginationGetPageSize: vi.fn(() => state.pageSize),
    paginationGoToFirstPage: vi.fn(() => {
      state.currentPage = 1;
    }),
    paginationGoToLastPage: vi.fn(() => {
      state.currentPage = state.totalPages;
    }),
    paginationGoToPage: vi.fn((page: number) => {
      state.currentPage = page + 1;
    }),
    setGridOption: vi.fn((key: string, value: unknown) => {
      if (key === 'pagination') state.pagination = Boolean(value);
      if (key === 'paginationPageSize') state.pageSize = Number(value);
    }),
    addEventListener: vi.fn(
      (event: string, cb: (...args: unknown[]) => void) => {
        state.listeners[event] = cb;
      }
    ),
    removeEventListener: vi.fn((event: string) => {
      delete state.listeners[event];
    }),
  };

  return { api, state };
};

describe('AGGridPagination', () => {
  it('returns null when grid api is missing or destroyed', () => {
    const nullRender = render(<AGGridPagination gridApi={null} />);
    expect(nullRender.container).toBeEmptyDOMElement();
    nullRender.unmount();

    const { api } = createGridApi({ destroyed: true });
    const destroyedRender = render(<AGGridPagination gridApi={api as never} />);
    expect(destroyedRender.container).toBeEmptyDOMElement();
  });

  it('wires pagination actions, page size changes, and floating state', () => {
    floatingStateStore.showFloating = true;
    animationStateStore.direction = 'next';
    floatingWrapperStore.calls = [];

    const onPageSizeChange = vi.fn();
    const { api } = createGridApi({
      pagination: true,
      currentPage: 2,
      totalPages: 5,
      pageSize: 25,
    });

    const view = render(
      <AGGridPagination
        gridApi={api as never}
        enableFloating={true}
        hideFloatingWhenModalOpen={false}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const context = contextStore.current as {
      currentPage: number;
      totalPages: number;
      itemsPerPage: number;
      selectedPageSizeIndex: number;
      pageSizes: number[];
      onPageChange: (page: number) => void;
      onItemsPerPageChange: (
        event: React.ChangeEvent<HTMLSelectElement>
      ) => void;
      handleItemsPerPageClick: (value: number, event: React.MouseEvent) => void;
      className?: string;
      showFloating: boolean;
    };

    expect(context.currentPage).toBe(2);
    expect(context.totalPages).toBe(5);
    expect(context.itemsPerPage).toBe(25);
    expect(context.selectedPageSizeIndex).toBe(0);
    expect(context.pageSizes).toEqual([25, 50, 100, -1]);
    expect(context.showFloating).toBe(true);
    expect(view.container.querySelector('.opacity-0')).toBeTruthy();
    expect(floatingWrapperStore.calls[0]).toEqual({
      show: true,
      hideWhenModalOpen: false,
    });

    context.onPageChange(2);
    expect(api.paginationGoToPage).not.toHaveBeenCalled();

    context.onPageChange(1);
    expect(api.paginationGoToFirstPage).toHaveBeenCalledTimes(1);

    context.onPageChange(5);
    expect(api.paginationGoToLastPage).toHaveBeenCalledTimes(1);

    context.onPageChange(3);
    expect(api.paginationGoToPage).toHaveBeenCalledWith(2);

    context.onItemsPerPageChange({
      target: { value: '50' },
    } as React.ChangeEvent<HTMLSelectElement>);
    expect(api.setGridOption).toHaveBeenCalledWith('pagination', true);
    expect(api.setGridOption).toHaveBeenCalledWith('paginationPageSize', 50);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);

    context.onItemsPerPageChange({
      target: { value: '-1' },
    } as React.ChangeEvent<HTMLSelectElement>);
    expect(api.setGridOption).toHaveBeenCalledWith('pagination', false);
    expect(onPageSizeChange).toHaveBeenCalledWith(-1);

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    context.handleItemsPerPageClick(25, {
      preventDefault,
      stopPropagation,
    } as unknown as React.MouseEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('supports pagination event wiring, custom page sizes, and disabled pagination mode', () => {
    floatingStateStore.showFloating = false;
    animationStateStore.direction = null;
    floatingWrapperStore.calls = [];

    const { api, state } = createGridApi({
      pagination: true,
      currentPage: 4,
      totalPages: 8,
      pageSize: 30,
    });

    const { unmount } = render(
      <AGGridPagination
        gridApi={api as never}
        enableFloating={false}
        hideFloatingWhenModalOpen={true}
        pageSizeOptions={[25, 50, -1]}
      />
    );

    let context = contextStore.current as {
      pageSizes: number[];
      selectedPageSizeIndex: number;
      direction: 'next' | 'prev' | null;
      showFloating: boolean;
    };

    expect(context.pageSizes).toEqual([25, 30, 50, -1]);
    expect(context.selectedPageSizeIndex).toBe(1);
    expect(context.direction).toBeNull();
    expect(context.showFloating).toBe(false);
    expect(floatingWrapperStore.calls).toEqual([]);
    expect(api.addEventListener).toHaveBeenCalledWith(
      'paginationChanged',
      expect.any(Function)
    );

    const listener = state.listeners.paginationChanged;
    if (listener) {
      listener();
    }
    context = contextStore.current as { pageSizes: number[] };
    expect(context.pageSizes).toEqual([25, 30, 50, -1]);

    unmount();
    expect(api.removeEventListener).toHaveBeenCalledWith(
      'paginationChanged',
      expect.any(Function)
    );

    const disabled = createGridApi({
      pagination: false,
      currentPage: 3,
      totalPages: 7,
      pageSize: 40,
    });
    render(<AGGridPagination gridApi={disabled.api as never} />);
    const disabledContext = contextStore.current as {
      currentPage: number;
      totalPages: number;
      itemsPerPage: number;
    };
    expect(disabledContext.currentPage).toBe(1);
    expect(disabledContext.totalPages).toBe(1);
    expect(disabledContext.itemsPerPage).toBe(-1);
  });
});
