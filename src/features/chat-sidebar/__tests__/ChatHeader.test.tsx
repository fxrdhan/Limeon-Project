import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatHeader from '../components/ChatHeader';

describe('ChatHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows online status for a fresh online presence even when the user is not in the same chat channel', () => {
    render(
      <ChatHeader
        model={{
          targetUser: {
            id: 'user-b',
            name: 'Gudang',
            email: 'gudang@example.com',
            profilephoto: null,
          },
          displayTargetPhotoUrl: null,
          isTargetOnline: true,
          targetUserPresence: {
            user_id: 'user-b',
            is_online: true,
            last_seen: '2026-03-07T09:59:40.000Z',
          },
          isSearchMode: false,
          searchQuery: '',
          searchState: 'idle',
          searchResultCount: 0,
          activeSearchResultIndex: 0,
          canNavigateSearchUp: false,
          canNavigateSearchDown: false,
          isSelectionMode: false,
          selectedMessageCount: 0,
          canDeleteSelectedMessages: false,
          searchInputRef: { current: null },
          onEnterSearchMode: vi.fn(),
          onExitSearchMode: vi.fn(),
          onEnterSelectionMode: vi.fn(),
          onExitSelectionMode: vi.fn(),
          onSearchQueryChange: vi.fn(),
          onNavigateSearchUp: vi.fn(),
          onNavigateSearchDown: vi.fn(),
          onFocusSearchInput: vi.fn(),
          onCopySelectedMessages: vi.fn(),
          onDeleteSelectedMessages: vi.fn(),
          onClose: vi.fn(),
          getInitials: name => name.slice(0, 2).toUpperCase(),
          getInitialsColor: () => 'bg-slate-500',
        }}
      />
    );

    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.queryByText(/Last seen/i)).toBeNull();
  });

  it('falls back to last seen for stale presence updates', () => {
    render(
      <ChatHeader
        model={{
          targetUser: {
            id: 'user-b',
            name: 'Gudang',
            email: 'gudang@example.com',
            profilephoto: null,
          },
          displayTargetPhotoUrl: null,
          isTargetOnline: false,
          targetUserPresence: {
            user_id: 'user-b',
            is_online: true,
            last_seen: '2026-03-07T09:45:00.000Z',
          },
          isSearchMode: false,
          searchQuery: '',
          searchState: 'idle',
          searchResultCount: 0,
          activeSearchResultIndex: 0,
          canNavigateSearchUp: false,
          canNavigateSearchDown: false,
          isSelectionMode: false,
          selectedMessageCount: 0,
          canDeleteSelectedMessages: false,
          searchInputRef: { current: null },
          onEnterSearchMode: vi.fn(),
          onExitSearchMode: vi.fn(),
          onEnterSelectionMode: vi.fn(),
          onExitSelectionMode: vi.fn(),
          onSearchQueryChange: vi.fn(),
          onNavigateSearchUp: vi.fn(),
          onNavigateSearchDown: vi.fn(),
          onFocusSearchInput: vi.fn(),
          onCopySelectedMessages: vi.fn(),
          onDeleteSelectedMessages: vi.fn(),
          onClose: vi.fn(),
          getInitials: name => name.slice(0, 2).toUpperCase(),
          getInitialsColor: () => 'bg-slate-500',
        }}
      />
    );

    expect(screen.getByText(/Last seen/i)).toBeTruthy();
    expect(screen.queryByText('Online')).toBeNull();
  });
});
