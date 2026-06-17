import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useChatConversationPagination } from '../hooks/useChatConversationPagination';

const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    fetchConversationMessages: vi.fn(),
  },
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: {
    fetchMessagesBetweenUsers: mockGateway.fetchConversationMessages,
  },
}));

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(promiseResolve => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const buildConversationSession = (activeSessionTokenRef: {
  current: number;
}) => ({
  getActiveSessionToken: () => activeSessionTokenRef.current,
  isSessionTokenActive: (sessionToken: number) =>
    sessionToken === activeSessionTokenRef.current,
  oldestLoadedMessageCreatedAtRef: {
    current: '2026-03-09T09:00:00.000Z',
  },
  oldestLoadedMessageIdRef: {
    current: 'message-10',
  },
  searchContextMessageIdsRef: {
    current: new Set<string>(),
  },
  hasCompletedInitialOpenLoadRef: {
    current: true,
  },
  activeSessionTokenRef,
  isInitialConversationLoadPendingRef: {
    current: false,
  },
  pendingConversationRealtimeEventsRef: {
    current: [],
  },
});

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
        conversationSession: {
          getActiveSessionToken: () => activeSessionToken,
          isSessionTokenActive: sessionToken =>
            sessionToken === activeSessionToken,
          oldestLoadedMessageCreatedAtRef: {
            current: '2026-03-09T09:00:00.000Z',
          },
          oldestLoadedMessageIdRef: {
            current: 'message-10',
          },
          searchContextMessageIdsRef: {
            current: new Set<string>(),
          },
          hasCompletedInitialOpenLoadRef: {
            current: true,
          },
          activeSessionTokenRef: {
            current: activeSessionToken,
          },
          isInitialConversationLoadPendingRef: {
            current: false,
          },
          pendingConversationRealtimeEventsRef: {
            current: [],
          },
        },
        hasOlderMessages: true,
        isLoadingOlderMessages: false,
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

  it('does not start duplicate older-message loads before loading state rerenders', async () => {
    const deferredFetch = createDeferred<{
      data: { messages: []; hasMore: boolean };
      error: null;
    }>();
    mockGateway.fetchConversationMessages.mockReturnValue(
      deferredFetch.promise
    );

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
        conversationSession: buildConversationSession({ current: 1 }),
        hasOlderMessages: true,
        isLoadingOlderMessages: false,
        setMessages,
        setHasOlderMessages,
        setIsLoadingOlderMessages,
        setOlderMessagesError,
      })
    );

    let firstLoadPromise!: Promise<void>;
    let secondLoadPromise!: Promise<void>;
    act(() => {
      firstLoadPromise = result.current();
      secondLoadPromise = result.current();
    });

    expect(mockGateway.fetchConversationMessages).toHaveBeenCalledOnce();

    await act(async () => {
      deferredFetch.resolve({
        data: {
          messages: [],
          hasMore: false,
        },
        error: null,
      });
      await Promise.all([firstLoadPromise, secondLoadPromise]);
    });

    expect(setIsLoadingOlderMessages).toHaveBeenCalledWith(true);
    expect(setIsLoadingOlderMessages).toHaveBeenCalledWith(false);
  });
});
