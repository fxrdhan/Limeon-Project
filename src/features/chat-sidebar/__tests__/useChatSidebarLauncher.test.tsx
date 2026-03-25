import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useChatSidebarLauncher } from '../hooks/useChatSidebarLauncher';
import { useChatSidebarStore } from '../../../store/chatSidebarStore';

const mockDirectoryRoster = {
  displayOnlineUsers: [],
  onlineUserIds: new Set<string>(),
  reorderedOnlineUsers: [],
  portalOrderedUsers: [],
  isDirectoryLoading: false,
  directoryError: null,
  hasMoreDirectoryUsers: false,
  retryLoadDirectory: vi.fn(),
  loadMoreDirectoryUsers: vi.fn(),
};

vi.mock('../hooks/useChatDirectoryRoster', () => ({
  useChatDirectoryRoster: vi.fn(() => mockDirectoryRoster),
}));

describe('useChatSidebarLauncher', () => {
  beforeEach(() => {
    useChatSidebarStore.setState({
      isOpen: false,
      targetUser: undefined,
    });
  });

  it('keeps the sidebar open when opening the same user twice', () => {
    const { result } = renderHook(() => useChatSidebarLauncher());
    const targetUser = {
      id: 'user-b',
      name: 'Gudang',
      email: 'gudang@example.com',
      profilephoto: null,
    };

    act(() => {
      result.current.openChatForUser(targetUser);
    });

    expect(useChatSidebarStore.getState()).toMatchObject({
      isOpen: true,
      targetUser,
    });

    act(() => {
      result.current.openChatForUser(targetUser);
    });

    expect(useChatSidebarStore.getState()).toMatchObject({
      isOpen: true,
      targetUser,
    });
  });
});
