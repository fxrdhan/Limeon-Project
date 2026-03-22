import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
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
  });
});
