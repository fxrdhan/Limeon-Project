import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import ChatSidebar from './index';

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
  it('does not mount the chat panel before any conversation is opened', () => {
    render(
      <ChatSidebar isOpen={false} onClose={vi.fn()} targetUser={undefined} />
    );

    expect(document.querySelector('aside[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByTestId('chat-sidebar-panel')).toBeNull();
  });

  it('keeps the panel mounted with the persisted target user during close animation', async () => {
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

    expect((await screen.findByTestId('chat-sidebar-panel')).textContent).toBe(
      'open:Gudang'
    );

    rerender(
      <ChatSidebar isOpen={false} onClose={vi.fn()} targetUser={undefined} />
    );

    expect(screen.getByTestId('chat-sidebar-panel').textContent).toBe(
      'closing:Gudang'
    );
  });

  it('unmounts the panel after the close animation finishes', async () => {
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

    await screen.findByTestId('chat-sidebar-panel');

    rerender(
      <ChatSidebar isOpen={false} onClose={vi.fn()} targetUser={undefined} />
    );

    expect(screen.getByTestId('chat-sidebar-panel').textContent).toBe(
      'closing:Gudang'
    );

    fireEvent.transitionEnd(document.querySelector('aside')!, {
      propertyName: 'width',
    });

    await waitFor(() => {
      expect(screen.queryByTestId('chat-sidebar-panel')).toBeNull();
    });
  });
});
