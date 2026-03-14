import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

const { authState, mockMarkMessageIdsAsRead, mockSendReadReceiptKeepalive } =
  vi.hoisted(() => ({
    authState: {
      user: {
        id: 'user-a',
      } as { id: string } | null,
      session: {
        access_token: 'access-token',
      } as { access_token: string } | null,
    },
    mockMarkMessageIdsAsRead: vi.fn(),
    mockSendReadReceiptKeepalive: vi.fn(),
  }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: {
    markMessageIdsAsRead: mockMarkMessageIdsAsRead,
    sendReadReceiptKeepalive: mockSendReadReceiptKeepalive,
  },
}));

describe('useChatRuntimeReadReceipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    chatRuntimeCache.readReceipts.reset();
    mockMarkMessageIdsAsRead.mockResolvedValue({
      data: [],
      error: null,
    });
    mockSendReadReceiptKeepalive.mockReturnValue(true);
    authState.user = {
      id: 'user-a',
    };
    authState.session = {
      access_token: 'access-token',
    };
  });

  afterEach(() => {
    chatRuntimeCache.readReceipts.reset();
  });

  it('sends pending read receipts through the keepalive path on page exit', async () => {
    const { useChatRuntimeReadReceipts } =
      await import('../hooks/useChatRuntimeReadReceipts');

    renderHook(() => useChatRuntimeReadReceipts());

    chatRuntimeCache.readReceipts.queueMessageIds('user-a', [
      'message-1',
      'message-2',
    ]);

    await act(async () => {
      const pageHideEvent = new Event('pagehide');
      Object.defineProperty(pageHideEvent, 'persisted', {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(pageHideEvent);
    });

    expect(mockSendReadReceiptKeepalive).toHaveBeenCalledWith(
      ['message-1', 'message-2'],
      'access-token'
    );
  });

  it('does not start keepalive sync when there are no queued read receipts', async () => {
    const { useChatRuntimeReadReceipts } =
      await import('../hooks/useChatRuntimeReadReceipts');

    renderHook(() => useChatRuntimeReadReceipts());

    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(mockSendReadReceiptKeepalive).not.toHaveBeenCalled();
  });
});
