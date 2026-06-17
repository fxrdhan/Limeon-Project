import { renderHook, act } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { UserDetails } from '../../../types/database';
import { useChatConversationInitialLoad } from '../hooks/useChatConversationInitialLoad';
import type { ChatConversationSessionState } from '../hooks/useChatConversationSessionState';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

const { mockFetchConversationMessages } = vi.hoisted(() => ({
  mockFetchConversationMessages: vi.fn(),
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: {
    fetchConversationMessages: mockFetchConversationMessages,
  },
}));

const createDeferred = <Value,>() => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
};

const createConversationSession = (): ChatConversationSessionState => {
  const activeSessionTokenRef = { current: 0 };

  return {
    activeSessionTokenRef,
    getActiveSessionToken: () => activeSessionTokenRef.current,
    hasCompletedInitialOpenLoadRef: { current: false },
    isInitialConversationLoadPendingRef: { current: false },
    isSessionTokenActive: (sessionToken: number) =>
      activeSessionTokenRef.current === sessionToken,
    oldestLoadedMessageCreatedAtRef: { current: null },
    oldestLoadedMessageIdRef: { current: null },
    pendingConversationRealtimeEventsRef: { current: [] },
    searchContextMessageIdsRef: { current: new Set() },
  };
};

const user: UserDetails = {
  email: 'admin@example.com',
  id: 'user-a',
  name: 'Admin',
  profilephoto: null,
  role: 'admin',
};

const targetUser = {
  email: 'target@example.com',
  id: 'user-b',
  name: 'Target',
  profilephoto: null,
};

describe('useChatConversationInitialLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatRuntimeCache.conversation.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    chatRuntimeCache.conversation.reset();
  });

  it('ignores a rejected stale initial load after the session is cancelled', async () => {
    const deferredLoad = createDeferred<never>();
    mockFetchConversationMessages.mockReturnValue(deferredLoad.promise);
    const setLoadError = vi.fn();

    const props = {
      conversationSession: createConversationSession(),
      currentChannelId: 'channel-1',
      initialMessageAnimationKeysRef: { current: new Set<string>() },
      initialOpenJumpAnimationKeysRef: { current: new Set<string>() },
      isOpen: true,
      markConversationRecoverySuccess: vi.fn(),
      markMessageIdsAsDelivered: vi.fn().mockResolvedValue(undefined),
      primeReplyTargetMessages: vi.fn().mockResolvedValue(undefined),
      realtimeRecoveryTick: 0,
      retryInitialLoadTick: 0,
      setHasOlderMessages: vi.fn(),
      setIsLoadingOlderMessages: vi.fn(),
      setLoadError,
      setLoading: vi.fn(),
      setMessages: vi.fn(),
      setOlderMessagesError: vi.fn(),
      targetUser,
      user,
    };

    const { rerender } = renderHook(
      ({ isOpen }) =>
        useChatConversationInitialLoad({
          ...props,
          isOpen,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    expect(mockFetchConversationMessages).toHaveBeenCalledWith('user-b', {
      limit: expect.any(Number),
    });

    rerender({ isOpen: false });

    await act(async () => {
      deferredLoad.reject(new Error('network failed'));
      await deferredLoad.promise.catch(() => undefined);
    });

    expect(setLoadError).not.toHaveBeenCalledWith('Gagal memuat percakapan');
    expect(setLoadError).not.toHaveBeenCalledWith(
      'Gagal menyegarkan percakapan'
    );
  });
});
