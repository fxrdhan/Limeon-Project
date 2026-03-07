import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatSidebar from './index';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    aside: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      onAnimationComplete: _onAnimationComplete,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      exit?: unknown;
      initial?: unknown;
      onAnimationComplete?: () => void;
      transition?: unknown;
    }) => <aside {...props}>{children}</aside>,
  },
}));

vi.mock('@/features/chat-sidebar', () => ({
  default: ({
    isOpen,
    targetUser,
  }: {
    isOpen: boolean;
    targetUser?: { name?: string };
  }) => (
    <div data-testid="chat-sidebar-panel">
      {isOpen ? 'open' : 'closing'}:{targetUser?.name ?? 'none'}
    </div>
  ),
}));

describe('ChatSidebar', () => {
  it('keeps the panel mounted with the persisted target user during close animation', () => {
    const { rerender } = render(
      <ChatSidebar
        isOpen
        onClose={vi.fn()}
        targetUser={{
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        }}
      />
    );

    expect(screen.getByTestId('chat-sidebar-panel').textContent).toBe(
      'open:Gudang'
    );

    rerender(
      <ChatSidebar isOpen={false} onClose={vi.fn()} targetUser={undefined} />
    );

    expect(screen.getByTestId('chat-sidebar-panel').textContent).toBe(
      'closing:Gudang'
    );
  });
});
