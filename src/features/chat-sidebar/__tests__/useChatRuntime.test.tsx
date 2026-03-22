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

const {
  mockRetryChatCleanupFailures,
  mockUseChatIncomingDeliveries,
  mockLoadPersistedPdfPreviewEntries,
  mockLoadPersistedImagePreviewEntries,
  mockLoadPersistedChatSharedLinkEntries,
  authState,
  mockToast,
} = vi.hoisted(() => ({
  mockRetryChatCleanupFailures: vi.fn(),
  mockUseChatIncomingDeliveries: vi.fn(),
  mockLoadPersistedPdfPreviewEntries: vi.fn(),
  mockLoadPersistedImagePreviewEntries: vi.fn(),
  mockLoadPersistedChatSharedLinkEntries: vi.fn(),
  authState: {
    user: null as { id: string } | null,
  },
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('@/services/api/chat.service', () => ({
  chatCleanupService: {
    retryChatCleanupFailures: mockRetryChatCleanupFailures,
  },
}));

vi.mock('../hooks/useChatIncomingDeliveries', () => ({
  useChatIncomingDeliveries: mockUseChatIncomingDeliveries,
}));

vi.mock('../utils/pdf-preview-persistence', () => ({
  loadPersistedPdfPreviewEntries: mockLoadPersistedPdfPreviewEntries,
}));

vi.mock('../utils/image-preview-persistence', () => ({
  loadPersistedImagePreviewEntries: mockLoadPersistedImagePreviewEntries,
}));

vi.mock('../utils/chat-shared-link-persistence', () => ({
  loadPersistedChatSharedLinkEntries: mockLoadPersistedChatSharedLinkEntries,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

describe('useChatRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    chatRuntimeCache.sharedLinks.reset();
    authState.user = null;
    mockLoadPersistedPdfPreviewEntries.mockResolvedValue([]);
    mockLoadPersistedImagePreviewEntries.mockResolvedValue([]);
    mockLoadPersistedChatSharedLinkEntries.mockResolvedValue([]);
    mockRetryChatCleanupFailures.mockResolvedValue({
      data: {
        resolvedCount: 0,
        remainingCount: 0,
        skippedCount: 0,
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('boots incoming delivery sync immediately and retries cleanup when a user is available', async () => {
    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    const { rerender } = renderHook(() => useChatRuntime());

    expect(mockUseChatIncomingDeliveries).toHaveBeenCalledTimes(1);
    expect(mockLoadPersistedPdfPreviewEntries).toHaveBeenCalledTimes(1);
    expect(mockLoadPersistedImagePreviewEntries).toHaveBeenCalledTimes(1);
    expect(mockLoadPersistedChatSharedLinkEntries).toHaveBeenCalledTimes(1);
    expect(mockRetryChatCleanupFailures).not.toHaveBeenCalled();

    authState.user = {
      id: 'user-a',
    };
    rerender();

    expect(mockUseChatIncomingDeliveries).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(1);
  });

  it('surfaces unresolved cleanup failures and retries them automatically', async () => {
    mockRetryChatCleanupFailures
      .mockResolvedValueOnce({
        data: {
          resolvedCount: 0,
          remainingCount: 2,
          skippedCount: 0,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          resolvedCount: 2,
          remainingCount: 0,
          skippedCount: 0,
        },
        error: null,
      });

    authState.user = {
      id: 'user-a',
    };

    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    renderHook(() => useChatRuntime());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      '2 cleanup lampiran chat masih tertunda. Akan dicoba lagi otomatis.',
      {
        id: 'chat-cleanup-runtime-warning',
      }
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(2);
    expect(mockToast.success).toHaveBeenCalledWith(
      'Cleanup lampiran chat yang tertunda berhasil diselesaikan.',
      {
        id: 'chat-cleanup-runtime-warning',
      }
    );
  });

  it('stops retrying when cleanup failures are reclassified as non-retryable', async () => {
    mockRetryChatCleanupFailures.mockResolvedValueOnce({
      data: {
        resolvedCount: 1,
        remainingCount: 0,
        skippedCount: 1,
      },
      error: null,
    });

    authState.user = {
      id: 'user-a',
    };

    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    renderHook(() => useChatRuntime());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.dismiss).toHaveBeenCalledWith(
      'chat-cleanup-runtime-warning'
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(1);
  });

  it('hydrates persisted shared links into the runtime cache on boot', async () => {
    mockLoadPersistedChatSharedLinkEntries.mockResolvedValueOnce([
      {
        messageId: 'file-1',
        sharedLink: {
          shortUrl: 'https://shrtlink.works/chat/file-1',
          storagePath: 'documents/channel/file-1.xlsx',
          targetUrl: null,
        },
      },
    ]);

    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    renderHook(() => useChatRuntime());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(chatRuntimeCache.sharedLinks.getEntry('file-1')).toEqual({
      shortUrl: 'https://shrtlink.works/chat/file-1',
      storagePath: 'documents/channel/file-1.xlsx',
      targetUrl: null,
    });
  });
});
