import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import ChatHeader from '../components/ChatHeader';

describe('ChatHeader', () => {
  const createModel = () => ({
    targetUser: {
      id: 'user-b',
      name: 'Gudang',
      email: 'gudang@example.com',
      profilephoto: null,
    },
    displayTargetPhotoUrl: null,
    isTargetOnline: false,
    targetUserPresence: null,
    targetUserPresenceError: null,
    isSearchMode: false,
    searchQuery: '',
    searchState: 'idle' as const,
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
    onClearSelectedMessages: vi.fn(),
    onExitSelectionMode: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onNavigateSearchUp: vi.fn(),
    onNavigateSearchDown: vi.fn(),
    onFocusSearchInput: vi.fn(),
    onCopySelectedMessages: vi.fn(),
    onDeleteSelectedMessages: vi.fn(),
    onClose: vi.fn(),
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
    getInitialsColor: () => 'bg-slate-500',
  });

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
          ...createModel(),
          isTargetOnline: true,
          targetUserPresence: {
            user_id: 'user-b',
            is_online: true,
            last_seen: '2026-03-07T09:59:40.000Z',
          },
        }}
      />
    );

    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.queryByText(/Terakhir aktif/i)).toBeNull();
  });

  it('falls back to last seen for stale presence updates', () => {
    render(
      <ChatHeader
        model={{
          ...createModel(),
          isTargetOnline: false,
          targetUserPresence: {
            user_id: 'user-b',
            is_online: true,
            last_seen: '2026-03-07T09:45:00.000Z',
          },
        }}
      />
    );

    expect(screen.getByText(/Terakhir aktif/i)).toBeTruthy();
    expect(screen.queryByText('Online')).toBeNull();
  });

  it('shows a dedicated error label while search mode is in an error state', () => {
    render(
      <ChatHeader
        model={{
          ...createModel(),
          isSearchMode: true,
          searchQuery: 'stok',
          searchState: 'error',
        }}
      />
    );

    expect(screen.getByText('Gagal')).toBeTruthy();
    expect(screen.queryByText('0/0')).toBeNull();
  });

  it('shows that additional search results are available beyond the loaded window', () => {
    render(
      <ChatHeader
        model={{
          ...createModel(),
          isSearchMode: true,
          searchQuery: 'stok',
          searchState: 'found',
          searchResultCount: 200,
          activeSearchResultIndex: 0,
          canNavigateSearchUp: false,
          canNavigateSearchDown: true,
          hasMoreSearchResults: true,
        }}
      />
    );

    expect(screen.getByText('1/200+')).toBeTruthy();
  });

  it('clears selected messages without exiting selection mode', () => {
    const model = {
      ...createModel(),
      isSelectionMode: true,
      selectedMessageCount: 3,
    };

    render(<ChatHeader model={model} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Batalkan semua pilihan' })
    );

    expect(model.onClearSelectedMessages).toHaveBeenCalledOnce();
    expect(model.onExitSelectionMode).not.toHaveBeenCalled();
    expect(screen.getByText('3 dipilih')).toBeTruthy();
  });
});
