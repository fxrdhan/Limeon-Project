import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_CONSTANTS } from '../../../components/search-bar/constants';
import { useChatMessageSearchMode } from '../hooks/useChatMessageSearchMode';

const { mockChatSidebarMessagesGateway } = vi.hoisted(() => ({
  mockChatSidebarMessagesGateway: {
    searchConversationMessages: vi.fn(),
    fetchConversationMessageContext: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: mockChatSidebarMessagesGateway,
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

describe('useChatMessageSearchMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores stale search context results after the query is cleared', async () => {
    const mergeSearchContextMessages = vi.fn();
    const contextRequest = createDeferred<{
      data: Array<{ id: string }>;
      error: null;
    }>();

    mockChatSidebarMessagesGateway.searchConversationMessages.mockResolvedValue(
      {
        data: [{ id: 'message-2' }],
        error: null,
      }
    );
    mockChatSidebarMessagesGateway.fetchConversationMessageContext.mockReturnValue(
      contextRequest.promise
    );

    const { result } = renderHook(() =>
      useChatMessageSearchMode({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        mergeSearchContextMessages,
        user: {
          id: 'user-a',
          name: 'Admin',
        },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
        },
      })
    );

    act(() => {
      result.current.handleEnterMessageSearchMode();
    });

    act(() => {
      result.current.handleMessageSearchQueryChange('invoice');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_CONSTANTS.DEBOUNCE_DELAY);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      mockChatSidebarMessagesGateway.searchConversationMessages
    ).toHaveBeenCalledWith('user-b', 'invoice');
    expect(
      mockChatSidebarMessagesGateway.fetchConversationMessageContext
    ).toHaveBeenCalledWith('user-b', 'message-2');

    act(() => {
      result.current.handleMessageSearchQueryChange('');
    });

    await act(async () => {
      contextRequest.resolve({
        data: [{ id: 'message-2' }],
        error: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mergeSearchContextMessages).not.toHaveBeenCalled();
    expect(result.current.activeSearchMessageId).toBeNull();
    expect(result.current.searchMatchedMessageIds).toEqual([]);
  });
});
