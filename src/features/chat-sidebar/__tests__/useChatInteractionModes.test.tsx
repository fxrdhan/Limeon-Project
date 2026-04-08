import { act, renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatInteractionModes } from '../hooks/useChatInteractionModes';
import { getAttachmentCaptionData } from '../utils/message-derivations';

const { mockSearchConversationMessages, mockFetchConversationMessageContext } =
  vi.hoisted(() => ({
    mockSearchConversationMessages: vi.fn(),
    mockFetchConversationMessageContext: vi.fn(),
  }));

const { mockResolveCopyableChatAssetUrl } = vi.hoisted(() => ({
  mockResolveCopyableChatAssetUrl: vi.fn(),
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: {
    searchConversationMessages: mockSearchConversationMessages,
    fetchConversationMessageContext: mockFetchConversationMessageContext,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../utils/message-file', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/message-file')>();

  return {
    ...actual,
    resolveCopyableChatAssetUrl: mockResolveCopyableChatAssetUrl,
  };
});

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  message_relation_kind: overrides.message_relation_kind ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('useChatInteractionModes', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn() as typeof cancelAnimationFrame
    );
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteText,
      },
    });
    mockSearchConversationMessages.mockResolvedValue({
      data: {
        messages: [],
        hasMore: false,
      },
      error: null,
    });
    mockFetchConversationMessageContext.mockResolvedValue({
      data: [],
      error: null,
    });
    mockResolveCopyableChatAssetUrl.mockImplementation(async (url: string) => {
      if (url.includes('image.png')) {
        return 'https://signed.example.com/chat/image.png';
      }

      if (url.includes('stok-opname.xlsx')) {
        return 'https://signed.example.com/chat/stok-opname.xlsx';
      }

      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks search matches and navigates active search message', async () => {
    const messagesContainerRef = createRef<HTMLDivElement>();
    messagesContainerRef.current = document.createElement('div');

    const messages = [
      buildMessage({ id: 'text-1', message: 'stok aman' }),
      buildMessage({
        id: 'file-1',
        message: 'https://example.com/report.pdf',
        message_type: 'file',
        file_name: 'report.pdf',
        file_kind: 'document',
      }),
      buildMessage({
        id: 'caption-1',
        message: 'stok opname',
        reply_to_id: 'file-1',
        message_relation_kind: 'attachment_caption',
      }),
      buildMessage({ id: 'text-2', message: 'stok cadangan' }),
    ];

    const { result } = renderHook(() =>
      useChatInteractionModes({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages,
        captionData: getAttachmentCaptionData(messages),
        mergeSearchContextMessages: vi.fn(),
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        closeMessageMenu: vi.fn(),
        messagesContainerRef,
        getAttachmentFileName: messageItem =>
          messageItem.file_name || 'Lampiran',
      })
    );

    mockSearchConversationMessages.mockResolvedValueOnce({
      data: {
        messages: [messages[0], messages[1], messages[3]],
        hasMore: false,
      },
      error: null,
    });

    act(() => {
      result.current.handleEnterMessageSearchMode();
      result.current.handleMessageSearchQueryChange('stok');
    });

    await waitFor(() => {
      expect(result.current.searchMatchedMessageIds).toEqual([
        'text-1',
        'file-1',
        'text-2',
      ]);
    });

    expect(result.current.activeSearchMessageId).toBe('text-1');

    act(() => {
      result.current.handleNavigateSearchDown();
    });

    expect(result.current.activeSearchMessageId).toBe('file-1');
  });

  it('copies selected visible messages and resets search when channel changes', async () => {
    const closeMessageMenu = vi.fn();
    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesContainer = document.createElement('div');
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 180,
      writable: true,
    });
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      messagesContainer.scrollTop = top ?? messagesContainer.scrollTop;
    });
    messagesContainer.scrollTo =
      scrollTo as unknown as typeof messagesContainer.scrollTo;
    messagesContainerRef.current = messagesContainer;
    const selectionMessages = [
      buildMessage({
        id: 'image-1',
        message: 'https://example.com/image.png',
        message_type: 'image',
        sender_name: 'Admin',
      }),
      buildMessage({
        id: 'caption-1',
        message: 'Rak depan',
        reply_to_id: 'image-1',
        message_relation_kind: 'attachment_caption',
        sender_name: 'Admin',
      }),
      buildMessage({
        id: 'file-1',
        message: 'https://example.com/stok-opname.xlsx',
        message_type: 'file',
        file_name: 'stok-opname.xlsx',
        file_kind: 'document',
        sender_name: 'Admin',
      }),
    ];
    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) =>
        useChatInteractionModes({
          isOpen: true,
          currentChannelId: channelId,
          messages: selectionMessages,
          captionData: getAttachmentCaptionData(selectionMessages),
          mergeSearchContextMessages: vi.fn(),
          user: { id: 'user-a', name: 'Admin' },
          targetUser: {
            id: 'user-b',
            name: 'Gudang',
            email: 'gudang@example.com',
            profilephoto: null,
          },
          closeMessageMenu,
          messagesContainerRef,
          getAttachmentFileName: messageItem =>
            messageItem.file_name || 'Lampiran',
        }),
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.handleEnterMessageSelectionMode();
    });

    await waitFor(() => {
      expect(result.current.isSelectionMode).toBe(true);
    });

    expect(scrollTo).toHaveBeenCalledWith({
      top: 180,
      behavior: 'auto',
    });

    act(() => {
      result.current.handleToggleMessageSelection('image-1');
      result.current.handleToggleMessageSelection('file-1');
    });

    await waitFor(() => {
      expect(result.current.selectedVisibleMessages).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleCopySelectedMessages();
    });

    expect(closeMessageMenu).toHaveBeenCalledOnce();
    expect(mockToast.loading).not.toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      '2 pesan berhasil disalin',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('Admin: signed.example.com/chat/image.png')
    );
    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('Admin: signed.example.com/chat/stok-opname.xlsx')
    );

    mockSearchConversationMessages.mockResolvedValueOnce({
      data: {
        messages: [
          buildMessage({
            id: 'image-1',
            message: 'https://example.com/image.png',
            message_type: 'image',
          }),
        ],
        hasMore: false,
      },
      error: null,
    });

    act(() => {
      result.current.handleEnterMessageSearchMode();
      result.current.handleMessageSearchQueryChange('rak');
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.messageSearchQuery).toBe('');
      expect(result.current.selectedMessageIds.size).toBe(0);
    });
  });

  it('clears the current selection without leaving selection mode', async () => {
    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesContainer = document.createElement('div');
    messagesContainer.scrollTo =
      vi.fn() as unknown as typeof messagesContainer.scrollTo;
    messagesContainerRef.current = messagesContainer;
    const selectionMessages = [
      buildMessage({
        id: 'text-1',
        message: 'stok aman',
      }),
      buildMessage({
        id: 'text-2',
        message: 'stok cadangan',
      }),
    ];

    const { result } = renderHook(() =>
      useChatInteractionModes({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: selectionMessages,
        captionData: getAttachmentCaptionData(selectionMessages),
        mergeSearchContextMessages: vi.fn(),
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        closeMessageMenu: vi.fn(),
        messagesContainerRef,
        getAttachmentFileName: messageItem =>
          messageItem.file_name || 'Lampiran',
      })
    );

    act(() => {
      result.current.handleEnterMessageSelectionMode();
    });

    await waitFor(() => {
      expect(result.current.isSelectionMode).toBe(true);
    });

    act(() => {
      result.current.handleToggleMessageSelection('text-1');
      result.current.handleToggleMessageSelection('text-2');
    });

    await waitFor(() => {
      expect(result.current.selectedMessageIds.size).toBe(2);
    });

    act(() => {
      result.current.handleClearSelectedMessages();
    });

    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.selectedMessageIds.size).toBe(0);
  });
});
