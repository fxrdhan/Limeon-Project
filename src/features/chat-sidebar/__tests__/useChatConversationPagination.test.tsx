import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatConversationPagination } from '../hooks/useChatConversationPagination';

const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    fetchConversationMessages: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
}));

describe('useChatConversationPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores an older pagination response after the active session changes', async () => {
    let resolveFetch:
      | ((value: {
          data: { messages: []; hasMore: boolean };
          error: null;
        }) => void)
      | undefined;

    mockGateway.fetchConversationMessages.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFetch = resolve;
        })
    );

    let activeSessionToken = 1;
    const setMessages = vi.fn();
    const setHasOlderMessages = vi.fn();
    const setIsLoadingOlderMessages = vi.fn();
    const setOlderMessagesError = vi.fn();

    const { result } = renderHook(() =>
      useChatConversationPagination({
        isOpen: true,
        user: {
          id: 'user-a',
          name: 'Admin',
          email: 'admin@example.com',
          profilephoto: null,
          role: 'admin',
        },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        getActiveSessionToken: () => activeSessionToken,
        isSessionTokenActive: sessionToken =>
          sessionToken === activeSessionToken,
        hasOlderMessages: true,
        isLoadingOlderMessages: false,
        oldestLoadedMessageCreatedAtRef: {
          current: '2026-03-09T09:00:00.000Z',
        },
        oldestLoadedMessageIdRef: {
          current: 'message-10',
        },
        setMessages,
        setHasOlderMessages,
        setIsLoadingOlderMessages,
        setOlderMessagesError,
      })
    );

    await act(async () => {
      const loadOlderMessagesPromise = result.current();
      activeSessionToken = 2;
      resolveFetch?.({
        data: {
          messages: [],
          hasMore: false,
        },
        error: null,
      });
      await loadOlderMessagesPromise;
    });

    expect(setMessages).not.toHaveBeenCalled();
    expect(setHasOlderMessages).not.toHaveBeenCalled();
    expect(setOlderMessagesError).not.toHaveBeenCalledWith(
      'Gagal memuat pesan lama'
    );
    expect(setIsLoadingOlderMessages).not.toHaveBeenCalledWith(false);
  });
});
