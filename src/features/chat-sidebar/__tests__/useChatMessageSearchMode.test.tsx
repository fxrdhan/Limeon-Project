import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
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

const flushTimersAndPromises = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SEARCH_CONSTANTS.DEBOUNCE_DELAY);
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useChatMessageSearchMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockChatSidebarMessagesGateway.fetchConversationMessageContext.mockResolvedValue(
      {
        data: [],
        error: null,
      }
    );
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
        data: {
          messages: [
            { id: 'message-2', created_at: '2026-03-10T08:00:00.000Z' },
          ],
          hasMore: false,
        },
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

    await flushTimersAndPromises();

    expect(
      mockChatSidebarMessagesGateway.searchConversationMessages
    ).toHaveBeenCalledWith('user-b', 'invoice', {
      limit: 200,
    });
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

  it('loads additional search matches when navigating past the current result window', async () => {
    const searchableMessages = [
      {
        id: 'message-1',
        created_at: '2026-03-10T08:00:00.000Z',
      },
      {
        id: 'message-2',
        created_at: '2026-03-10T08:01:00.000Z',
      },
      {
        id: 'message-3',
        created_at: '2026-03-10T08:02:00.000Z',
      },
    ];

    mockChatSidebarMessagesGateway.searchConversationMessages
      .mockResolvedValueOnce({
        data: {
          messages: searchableMessages.slice(0, 2),
          hasMore: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          messages: [searchableMessages[2]],
          hasMore: false,
        },
        error: null,
      });

    const { result } = renderHook(() =>
      useChatMessageSearchMode({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: searchableMessages,
        mergeSearchContextMessages: vi.fn(),
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
      result.current.handleMessageSearchQueryChange('stok');
    });

    await flushTimersAndPromises();

    expect(result.current.searchMatchedMessageIds).toEqual([
      'message-1',
      'message-2',
    ]);
    expect(result.current.hasMoreSearchResults).toBe(true);
    expect(result.current.activeSearchMessageId).toBe('message-1');

    act(() => {
      result.current.handleNavigateSearchDown();
    });

    expect(result.current.activeSearchMessageId).toBe('message-2');

    await act(async () => {
      result.current.handleNavigateSearchDown();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      mockChatSidebarMessagesGateway.searchConversationMessages
    ).toHaveBeenNthCalledWith(2, 'user-b', 'stok', {
      afterCreatedAt: '2026-03-10T08:01:00.000Z',
      afterId: 'message-2',
      limit: 200,
    });
    expect(result.current.searchMatchedMessageIds).toEqual([
      'message-1',
      'message-2',
      'message-3',
    ]);
    expect(result.current.activeSearchMessageId).toBe('message-3');
    expect(result.current.hasMoreSearchResults).toBe(false);
  });

  it('wraps to the first search result after reaching the last loaded match', async () => {
    const searchableMessages = [
      {
        id: 'message-1',
        created_at: '2026-03-10T08:00:00.000Z',
      },
      {
        id: 'message-2',
        created_at: '2026-03-10T08:01:00.000Z',
      },
    ];

    mockChatSidebarMessagesGateway.searchConversationMessages.mockResolvedValue(
      {
        data: {
          messages: searchableMessages,
          hasMore: false,
        },
        error: null,
      }
    );

    const { result } = renderHook(() =>
      useChatMessageSearchMode({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: searchableMessages,
        mergeSearchContextMessages: vi.fn(),
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
      result.current.handleMessageSearchQueryChange('stok');
    });

    await flushTimersAndPromises();

    expect(result.current.activeSearchMessageId).toBe('message-1');
    expect(result.current.canNavigateSearchDown).toBe(true);
    expect(result.current.canNavigateSearchUp).toBe(true);

    act(() => {
      result.current.handleNavigateSearchDown();
    });

    expect(result.current.activeSearchMessageId).toBe('message-2');

    act(() => {
      result.current.handleNavigateSearchDown();
    });

    expect(result.current.activeSearchMessageId).toBe('message-1');

    act(() => {
      result.current.handleNavigateSearchUp();
    });

    expect(result.current.activeSearchMessageId).toBe('message-2');
  });
});
