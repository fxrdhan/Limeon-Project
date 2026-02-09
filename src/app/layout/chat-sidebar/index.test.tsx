import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ChatSidebar from './index';

const chatSidebarPanelMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/shared/chat-sidebar-panel', () => ({
  default: ({
    isOpen,
    onClose,
    targetUser,
  }: {
    isOpen: boolean;
    onClose: () => void;
    targetUser?: { name?: string };
  }) => {
    chatSidebarPanelMock({ isOpen, targetUser });
    return (
      <div data-testid="chat-sidebar-panel">
        <span>{targetUser?.name ?? 'no-target'}</span>
        <button type="button" onClick={onClose}>
          close panel
        </button>
      </div>
    );
  },
}));

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

describe('ChatSidebar', () => {
  it('does not render sidebar content when closed', () => {
    render(<ChatSidebar isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByTestId('chat-sidebar-panel')).not.toBeInTheDocument();
    expect(chatSidebarPanelMock).not.toHaveBeenCalled();
  });

  it('renders sidebar panel and forwards close interaction when open', () => {
    const onClose = vi.fn();

    render(
      <ChatSidebar
        isOpen={true}
        onClose={onClose}
        targetUser={{
          id: 'user-2',
          name: 'Target User',
          email: 'target@example.com',
          profilephoto: null,
        }}
      />
    );

    expect(screen.getByTestId('chat-sidebar-panel')).toBeInTheDocument();
    expect(screen.getByText('Target User')).toBeInTheDocument();
    expect(chatSidebarPanelMock).toHaveBeenCalledWith({
      isOpen: true,
      targetUser: {
        id: 'user-2',
        name: 'Target User',
        email: 'target@example.com',
        profilephoto: null,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'close panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
