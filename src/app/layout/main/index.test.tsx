import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatTargetUser } from '@/types';
import MainLayout from './index';

const usePresenceMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/presence/usePresence', () => ({
  usePresence: usePresenceMock,
}));

vi.mock('@/app/layout/sidebar', () => ({
  default: ({
    collapsed,
    isLocked,
    toggleLock,
    expandSidebar,
    collapseSidebar,
  }: {
    collapsed: boolean;
    isLocked: boolean;
    toggleLock: () => void;
    expandSidebar: () => void;
    collapseSidebar: () => void;
  }) => (
    <div>
      <div data-testid="sidebar-collapsed">{String(collapsed)}</div>
      <div data-testid="sidebar-locked">{String(isLocked)}</div>
      <button onClick={toggleLock} type="button">
        toggle-lock
      </button>
      <button onClick={expandSidebar} type="button">
        expand
      </button>
      <button onClick={collapseSidebar} type="button">
        collapse
      </button>
    </div>
  ),
}));

vi.mock('@/app/layout/navbar', () => ({
  default: ({
    sidebarCollapsed,
    showChatSidebar,
    onChatUserSelect,
  }: {
    sidebarCollapsed: boolean;
    showChatSidebar: boolean;
    onChatUserSelect: (user: ChatTargetUser) => void;
  }) => (
    <div>
      <div data-testid="navbar-collapsed">{String(sidebarCollapsed)}</div>
      <div data-testid="navbar-chat-open">{String(showChatSidebar)}</div>
      <button
        onClick={() =>
          onChatUserSelect({ id: 'u-1', nama_lengkap: 'User 1' } as never)
        }
        type="button"
      >
        chat-u1
      </button>
      <button
        onClick={() =>
          onChatUserSelect({ id: 'u-2', nama_lengkap: 'User 2' } as never)
        }
        type="button"
      >
        chat-u2
      </button>
    </div>
  ),
}));

vi.mock('@/app/layout/chat-sidebar', () => ({
  default: ({
    isOpen,
    targetUser,
    onClose,
  }: {
    isOpen: boolean;
    targetUser?: ChatTargetUser;
    onClose: () => void;
  }) => (
    <div>
      <div data-testid="chat-open">{String(isOpen)}</div>
      <div data-testid="chat-user">{targetUser?.id ?? 'none'}</div>
      <button onClick={onClose} type="button">
        close-chat
      </button>
    </div>
  ),
}));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<MainLayout />} path="/">
          <Route
            element={<div data-testid="outlet-content">Outlet</div>}
            index
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('MainLayout', () => {
  beforeEach(() => {
    usePresenceMock.mockReset();
    usePresenceMock.mockReturnValue(undefined);
  });

  it('renders with initial state and outlet content', () => {
    renderLayout();

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('sidebar-locked')).toHaveTextContent('false');
    expect(screen.getByTestId('chat-open')).toHaveTextContent('false');
    expect(usePresenceMock).toHaveBeenCalled();
  });

  it('handles sidebar expand/collapse with lock state', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'expand' }));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'toggle-lock' }));
    expect(screen.getByTestId('sidebar-locked')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'collapse' }));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'toggle-lock' }));
    fireEvent.click(screen.getByRole('button', { name: 'collapse' }));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
  });

  it('toggles chat target and supports close action', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'chat-u1' }));
    expect(screen.getByTestId('chat-open')).toHaveTextContent('true');
    expect(screen.getByTestId('chat-user')).toHaveTextContent('u-1');

    fireEvent.click(screen.getByRole('button', { name: 'chat-u1' }));
    expect(screen.getByTestId('chat-open')).toHaveTextContent('false');
    expect(screen.getByTestId('chat-user')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'chat-u2' }));
    expect(screen.getByTestId('chat-user')).toHaveTextContent('u-2');

    fireEvent.click(screen.getByRole('button', { name: 'close-chat' }));
    expect(screen.getByTestId('chat-open')).toHaveTextContent('false');
  });

  it('handles Ctrl+S shortcut to toggle sidebar and lock it', () => {
    renderLayout();

    fireEvent.keyDown(window, { ctrlKey: true, key: 's' });
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    expect(screen.getByTestId('sidebar-locked')).toHaveTextContent('true');
  });
});
