import type { ComponentProps } from 'react';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import ChatHeader from '../components/ChatHeader';
import type { ChatMessage } from '../data/chatSidebarGateway';

describe('ChatHeader', () => {
  const createMessage = (id: string): ChatMessage => ({
    id,
    sender_id: 'user-a',
    receiver_id: 'user-b',
    channel_id: 'dm_user-a_user-b',
    message: id,
    reply_to_id: null,
    created_at: '2026-03-20T10:00:00.000Z',
    updated_at: '2026-03-20T10:00:00.000Z',
    is_read: false,
    message_type: 'text',
  });

  const createRuntime = (): ComponentProps<typeof ChatHeader>['runtime'] => ({
    targetUser: {
      id: 'user-b',
      name: 'Gudang',
      email: 'gudang@example.com',
      profilephoto: null,
    },
    user: {
      id: 'user-a',
      name: 'Admin',
      email: 'admin@example.com',
      profilephoto: null,
    },
    displayTargetPhotoUrl: null,
    session: {
      isTargetOnline: false,
      targetUserPresence: null,
      targetUserPresenceError: null,
    },
    interaction: {
      isMessageSearchMode: false,
      messageSearchQuery: '',
      messageSearchState: 'idle',
      searchMatchedMessageIds: [],
      activeSearchResultIndex: 0,
      canNavigateSearchUp: false,
      canNavigateSearchDown: false,
      hasMoreSearchResults: false,
      isSelectionMode: false,
      selectedVisibleMessages: [],
      canDeleteSelectedMessages: false,
      searchInputRef: { current: null },
      handleEnterMessageSearchMode: vi.fn(),
      handleExitMessageSearchMode: vi.fn(),
      handleEnterMessageSelectionMode: vi.fn(),
      handleClearSelectedMessages: vi.fn(),
      handleExitMessageSelectionMode: vi.fn(),
      handleMessageSearchQueryChange: vi.fn(),
      handleNavigateSearchUp: vi.fn(),
      handleNavigateSearchDown: vi.fn(),
      handleFocusSearchInput: vi.fn(),
      handleCopySelectedMessages: vi.fn(),
    },
    actions: {
      handleDeleteSelectedMessages: vi.fn(),
      handleClose: vi.fn(),
      handleOpenContactList: vi.fn(),
      getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
      getInitialsColor: () => 'bg-slate-500',
    },
  });

  it('clears selected messages without exiting selection mode', () => {
    const runtime = createRuntime();
    runtime.interaction.isSelectionMode = true;
    runtime.interaction.selectedVisibleMessages = [
      createMessage('message-1'),
      createMessage('message-2'),
      createMessage('message-3'),
    ];

    render(<ChatHeader runtime={runtime} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Batalkan semua pilihan' })
    );

    expect(
      runtime.interaction.handleClearSelectedMessages
    ).toHaveBeenCalledOnce();
    expect(
      runtime.interaction.handleExitMessageSelectionMode
    ).not.toHaveBeenCalled();
  });

  it('returns to the contact list instead of closing the sidebar in selection mode', () => {
    const runtime = createRuntime();
    runtime.interaction.isSelectionMode = true;

    render(<ChatHeader runtime={runtime} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Kembali ke daftar kontak' })
    );

    expect(runtime.actions.handleOpenContactList).toHaveBeenCalledOnce();
    expect(runtime.actions.handleClose).not.toHaveBeenCalled();
  });

  it('marks the current user conversation in the header name', () => {
    const runtime = createRuntime();
    runtime.targetUser = {
      id: 'user-a',
      name: 'Admin',
      email: 'admin@example.com',
      profilephoto: null,
    };
    runtime.session.isTargetOnline = true;

    render(<ChatHeader runtime={runtime} />);

    expect(screen.getByText('Admin (You)')).toBeDefined();
  });
});
