import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatComposerActions } from '../hooks/useChatComposerActions';

const { mockChatService, mockToast, mockUseChatComposerSend } = vi.hoisted(
  () => ({
    mockChatService: {
      updateMessage: vi.fn(),
      deleteMessageThread: vi.fn(),
      fetchMessagesBetweenUsers: vi.fn(),
    },
    mockToast: {
      error: vi.fn(),
      success: vi.fn(),
      promise: vi.fn(),
    },
    mockUseChatComposerSend: vi.fn(),
  })
);

vi.mock('@/services/api/chat.service', () => ({
  chatService: mockChatService,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../hooks/useChatComposerSend', () => ({
  useChatComposerSend: mockUseChatComposerSend,
}));

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

describe('useChatComposerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseChatComposerSend.mockReturnValue({
      handleSendMessage: vi.fn(),
      handleKeyPress: vi.fn(),
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
  });

  it('restores message state when editing fails', async () => {
    mockChatService.updateMessage.mockResolvedValue({
      data: null,
      error: new Error('update failed'),
    });

    const focusMessageComposer = vi.fn();
    const closeMessageMenu = vi.fn();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        buildMessage({
          id: 'message-1',
          message: 'before edit',
          sender_name: 'Admin',
          receiver_name: 'Gudang',
        }),
      ]);
      const [message, setMessage] = useState('after edit');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        'message-1'
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const actions = useChatComposerActions({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        closeMessageMenu,
        focusMessageComposer,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage: vi.fn(),
        pendingImagePreviewUrlsRef,
      });

      return {
        ...actions,
        messages,
        message,
        editingMessageId,
      };
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(result.current.messages[0]?.message).toBe('before edit');
      expect(result.current.message).toBe('after edit');
      expect(result.current.editingMessageId).toBe('message-1');
    });

    expect(closeMessageMenu).toHaveBeenCalledOnce();
    expect(focusMessageComposer).toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Gagal memperbarui pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('reconciles the conversation from the server when delete fails partway through', async () => {
    const attachmentMessage = buildMessage({
      id: 'file-1',
      message: 'https://example.com/report.pdf',
      message_type: 'file',
      file_name: 'report.pdf',
      file_kind: 'document',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const captionMessage = buildMessage({
      id: 'caption-1',
      message: 'stok opname',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const broadcastDeletedMessage = vi.fn();

    mockChatService.deleteMessageThread.mockResolvedValue({
      data: null,
      error: new Error('delete failed'),
    });
    mockChatService.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [attachmentMessage],
      error: null,
    });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        attachmentMessage,
        captionMessage,
      ]);
      const [message, setMessage] = useState('');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const actions = useChatComposerActions({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage,
        pendingImagePreviewUrlsRef,
      });

      return {
        ...actions,
        messages,
      };
    });

    let deleteResult = false;
    await act(async () => {
      deleteResult =
        await result.current.handleDeleteMessage(attachmentMessage);
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['file-1']);
    });

    expect(deleteResult).toBe(false);
    expect(mockChatService.deleteMessageThread).toHaveBeenCalledWith('file-1');
    expect(broadcastDeletedMessage).not.toHaveBeenCalled();
    expect(mockChatService.fetchMessagesBetweenUsers).toHaveBeenCalledWith(
      'user-a',
      'user-b',
      'channel-1'
    );
    expect(mockToast.error).toHaveBeenCalledWith(
      'Gagal menghapus pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('broadcasts every deleted id returned by the atomic delete thread rpc', async () => {
    const attachmentMessage = buildMessage({
      id: 'file-atomic',
      message: 'https://example.com/report-atomic.pdf',
      message_type: 'file',
      file_name: 'report-atomic.pdf',
      file_kind: 'document',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const captionMessage = buildMessage({
      id: 'caption-atomic',
      message: 'stok opname',
      reply_to_id: 'file-atomic',
      message_relation_kind: 'attachment_caption',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const broadcastDeletedMessage = vi.fn();

    mockChatService.deleteMessageThread.mockResolvedValue({
      data: ['caption-atomic', 'file-atomic'],
      error: null,
    });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        attachmentMessage,
        captionMessage,
      ]);
      const [message, setMessage] = useState('');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useChatComposerActions({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage,
        pendingImagePreviewUrlsRef,
      });
    });

    await act(async () => {
      await result.current.handleDeleteMessage(attachmentMessage);
    });

    expect(mockChatService.deleteMessageThread).toHaveBeenCalledWith(
      'file-atomic'
    );
    expect(broadcastDeletedMessage).toHaveBeenCalledWith('caption-atomic');
    expect(broadcastDeletedMessage).toHaveBeenCalledWith('file-atomic');
  });

  it('suppresses error toast when delete failure is handled by the caller', async () => {
    const attachmentMessage = buildMessage({
      id: 'file-2',
      message: 'https://example.com/report-2.pdf',
      message_type: 'file',
      file_name: 'report-2.pdf',
      file_kind: 'document',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });

    mockChatService.deleteMessageThread.mockResolvedValue({
      data: null,
      error: new Error('delete failed'),
    });
    mockChatService.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [attachmentMessage],
      error: null,
    });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        attachmentMessage,
      ]);
      const [message, setMessage] = useState('');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useChatComposerActions({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage: vi.fn(),
        pendingImagePreviewUrlsRef,
      });
    });

    let deleteResult = true;
    await act(async () => {
      deleteResult = await result.current.handleDeleteMessage(
        attachmentMessage,
        {
          suppressErrorToast: true,
        }
      );
    });

    expect(deleteResult).toBe(false);
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('does not send while IME composition is still active', async () => {
    const handleSendMessage = vi.fn();
    mockUseChatComposerSend.mockReturnValue({
      handleSendMessage,
    });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [message, setMessage] = useState('draft');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useChatComposerActions({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage: vi.fn(),
        pendingImagePreviewUrlsRef,
      });
    });

    const preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyPress({
        key: 'Enter',
        shiftKey: false,
        keyCode: 229,
        nativeEvent: { isComposing: true },
        preventDefault,
      } as unknown as ReactKeyboardEvent);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(handleSendMessage).not.toHaveBeenCalled();
  });
});
