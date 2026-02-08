import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './index';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

const renderSidebar = ({
  path = '/',
  collapsed = false,
  isLocked = true,
}: {
  path?: string;
  collapsed?: boolean;
  isLocked?: boolean;
} = {}) => {
  const props = {
    collapsed,
    isLocked,
    toggleLock: vi.fn(),
    expandSidebar: vi.fn(),
    collapseSidebar: vi.fn(),
  };

  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar {...props} />
    </MemoryRouter>
  );

  return props;
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles hover expand/collapse behavior when unlocked', () => {
    const collapsedProps = renderSidebar({
      path: '/',
      collapsed: true,
      isLocked: false,
    });

    const aside = document.querySelector('aside');
    expect(aside).toBeTruthy();

    fireEvent.mouseEnter(aside!);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(collapsedProps.expandSidebar).toHaveBeenCalled();

    const expandedProps = renderSidebar({
      path: '/',
      collapsed: false,
      isLocked: false,
    });

    const expandedAside = document.querySelectorAll('aside')[1];
    fireEvent.mouseLeave(expandedAside!);

    expect(expandedProps.collapseSidebar).toHaveBeenCalled();
  });

  it('renders lock toggle in expanded mode and toggles lock state', () => {
    const props = renderSidebar({
      path: '/',
      collapsed: false,
      isLocked: true,
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const lockButton = screen.getByLabelText('Buka Kunci Sidebar');
    expect(lockButton).toBeInTheDocument();

    fireEvent.click(lockButton);
    expect(props.toggleLock).toHaveBeenCalled();
  });

  it('opens active submenu, keeps item master link stable, and handles submenu toggle', () => {
    renderSidebar({
      path: '/master-data/item-master/details',
      collapsed: false,
      isLocked: true,
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Item Master')).toBeInTheDocument();
    expect(screen.getByText('Supplier')).toBeInTheDocument();

    const itemMasterLink = screen.getByRole('link', { name: 'Item Master' });
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    itemMasterLink.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);

    const masterDataButton = screen.getByRole('button', {
      name: /Master Data/i,
    });
    fireEvent.click(masterDataButton);

    expect(screen.queryByText('Supplier')).not.toBeInTheDocument();

    fireEvent.mouseEnter(masterDataButton);
    expect(screen.getByText('Supplier')).toBeInTheDocument();
  }, 15000);

  it('navigates when clicking non-active menu item', () => {
    renderSidebar({
      path: '/settings/profile',
      collapsed: false,
      isLocked: true,
    });

    const dashboardButton = screen.getByRole('button', { name: /Dashboard/i });
    fireEvent.click(dashboardButton);

    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
