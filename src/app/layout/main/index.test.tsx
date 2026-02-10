import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MainLayout from './index';

const usePresenceMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/presence/usePresence', () => ({
  usePresence: usePresenceMock,
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet">outlet</div>,
}));

vi.mock('@/app/layout/sidebar', () => ({
  default: ({
    collapsed,
    isLocked,
    expandSidebar,
    collapseSidebar,
    toggleLock,
  }: {
    collapsed: boolean;
    isLocked: boolean;
    expandSidebar: () => void;
    collapseSidebar: () => void;
    toggleLock: () => void;
  }) => (
    <div>
      <div data-testid="sidebar-state">{`${collapsed}:${isLocked}`}</div>
      <button onClick={expandSidebar}>expand</button>
      <button onClick={collapseSidebar}>collapse</button>
      <button onClick={toggleLock}>toggle-lock</button>
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
    onChatUserSelect: (user: {
      id: string;
      name: string;
      email: string;
    }) => void;
  }) => (
    <div>
      <div data-testid="navbar-state">{`${sidebarCollapsed}:${showChatSidebar}`}</div>
      <button
        onClick={() =>
          onChatUserSelect({
            id: 'u-2',
            name: 'User 2',
            email: 'u2@test.dev',
          })
        }
      >
        select-u2
      </button>
      <button
        onClick={() =>
          onChatUserSelect({
            id: 'u-3',
            name: 'User 3',
            email: 'u3@test.dev',
          })
        }
      >
        select-u3
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
    targetUser?: { id: string };
    onClose: () => void;
  }) => (
    <div>
      <div data-testid="chat-state">{`${isOpen}:${targetUser?.id ?? 'none'}`}</div>
      <button onClick={onClose}>close-chat</button>
    </div>
  ),
}));

describe('MainLayout', () => {
  it('handles sidebar state transitions and chat toggling behavior', () => {
    render(<MainLayout />);

    expect(usePresenceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true:false');
    expect(screen.getByTestId('chat-state')).toHaveTextContent('false:none');

    fireEvent.click(screen.getByText('collapse'));
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true:false');

    fireEvent.click(screen.getByText('toggle-lock'));
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false:true');

    fireEvent.click(screen.getByText('expand'));
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false:true');

    fireEvent.click(screen.getByText('toggle-lock'));
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
      'false:false'
    );

    fireEvent.click(screen.getByText('collapse'));
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true:false');

    fireEvent.click(screen.getByText('select-u2'));
    expect(screen.getByTestId('chat-state')).toHaveTextContent('true:u-2');

    fireEvent.click(screen.getByText('select-u2'));
    expect(screen.getByTestId('chat-state')).toHaveTextContent('false:none');

    fireEvent.click(screen.getByText('select-u3'));
    expect(screen.getByTestId('chat-state')).toHaveTextContent('true:u-3');

    fireEvent.click(screen.getByText('close-chat'));
    expect(screen.getByTestId('chat-state')).toHaveTextContent('false:none');
  });

  it('toggles sidebar via ctrl+s keyboard shortcut', () => {
    render(<MainLayout />);

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(
      screen.getByTestId('sidebar-state').textContent?.startsWith('false')
    ).toBe(true);
  });
});
