import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MouseEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './index';

const navigateMock = vi.hoisted(() => vi.fn());
const locationState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('react-router-dom', () => ({
  useLocation: () => locationState,
  useNavigate: () => navigateMock,
  Link: ({
    to,
    onClick,
    children,
    ...rest
  }: {
    to: string;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    children: ReactNode;
  }) => (
    <a
      href={to}
      onClick={event => {
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as ReactNode}</div>
    ),
    button: ({ children, ...props }: Record<string, unknown>) => (
      <button {...props}>{children as ReactNode}</button>
    ),
  },
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
    locationState.pathname = '/';
  });

  it('expands/collapses on hover and toggles lock button', () => {
    const expandSidebar = vi.fn();
    const collapseSidebar = vi.fn();
    const toggleLock = vi.fn();

    const { container } = render(
      <Sidebar
        collapsed={true}
        isLocked={false}
        toggleLock={toggleLock}
        expandSidebar={expandSidebar}
        collapseSidebar={collapseSidebar}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeTruthy();

    fireEvent.mouseEnter(aside!);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(expandSidebar).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(aside!);
    expect(collapseSidebar).not.toHaveBeenCalled();

    const { container: expanded } = render(
      <Sidebar
        collapsed={false}
        isLocked={false}
        toggleLock={toggleLock}
        expandSidebar={expandSidebar}
        collapseSidebar={collapseSidebar}
      />
    );

    const expandedAside = expanded.querySelector('aside');
    fireEvent.mouseLeave(expandedAside!);
    expect(collapseSidebar).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Kunci Sidebar'));
    expect(toggleLock).toHaveBeenCalled();
  });

  it('navigates non-group menu and prevents item-master nested navigation', () => {
    locationState.pathname = '/master-data/item-master/detail';
    const preventDefault = vi.fn();

    render(
      <Sidebar
        collapsed={false}
        isLocked={true}
        toggleLock={vi.fn()}
        expandSidebar={vi.fn()}
        collapseSidebar={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Dashboard'));
    expect(navigateMock).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByText('Master Data'));

    const itemMasterLink = screen.getByText('Item Master').closest('a');
    expect(itemMasterLink).toBeTruthy();
    fireEvent.click(itemMasterLink!, { preventDefault });
  });

  it('opens and closes menu groups and reacts to route changes', () => {
    locationState.pathname = '/master-data/suppliers';

    const { rerender, container } = render(
      <Sidebar
        collapsed={false}
        isLocked={false}
        toggleLock={vi.fn()}
        expandSidebar={vi.fn()}
        collapseSidebar={vi.fn()}
      />
    );

    const aside = container.querySelector('aside');
    const masterDataButton = screen.getByText('Master Data').closest('button');
    expect(masterDataButton).toBeTruthy();

    fireEvent.mouseEnter(masterDataButton!);
    expect(screen.getByText('Supplier')).toBeInTheDocument();

    fireEvent.click(masterDataButton!);
    fireEvent.click(masterDataButton!);

    fireEvent.mouseLeave(aside!);
    act(() => {
      vi.advanceTimersByTime(210);
    });

    locationState.pathname = '/purchases/orders';
    rerender(
      <Sidebar
        collapsed={false}
        isLocked={false}
        toggleLock={vi.fn()}
        expandSidebar={vi.fn()}
        collapseSidebar={vi.fn()}
      />
    );
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByText('Daftar Pesanan Beli')).toBeInTheDocument();
  });
});
