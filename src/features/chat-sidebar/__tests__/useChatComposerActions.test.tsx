import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatComposerActions } from '../hooks/useChatComposerActions';

const { mockChatService, mockToast, mockUseChatComposerSend } = vi.hoisted(
  () => ({
    mockChatService: {
      editTextMessage: vi.fn(),
      deleteMessageThreadAndCleanup: vi.fn(),
      deleteMessageThreadsAndCleanup: vi.fn(),
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
  chatMessagesService: mockChatService,
  chatCleanupService: mockChatService,
  chatPresenceService: mockChatService,
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
    mockChatService.editTextMessage.mockResolvedValue({
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
        isComposerAttachmentLoading: false,
        closeMessageMenu,
        focusMessageComposer,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
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

  it('menolak masuk mode edit saat masih ada lampiran draft', async () => {
    const closeMessageMenu = vi.fn();
    const clearPendingComposerAttachments = vi.fn();
    const focusMessageComposer = vi.fn();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        buildMessage({
          id: 'message-1',
          message: 'before edit',
          sender_name: 'Admin',
          receiver_name: 'Gudang',
        }),
      ]);
      const [message, setMessage] = useState('draft caption');
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
        pendingComposerAttachments: [
          {
            id: 'pending-image-1',
            file: new File(['image'], 'stok.png', { type: 'image/png' }),
            fileName: 'stok.png',
            fileTypeLabel: 'PNG',
            fileKind: 'image',
            mimeType: 'image/png',
            previewUrl: 'blob:preview',
            pdfCoverUrl: null,
            pdfPageCount: null,
          },
        ],
        clearPendingComposerAttachments,
        restorePendingComposerAttachments: vi.fn(),
        isComposerAttachmentLoading: false,
        closeMessageMenu,
        focusMessageComposer,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
      });

      return {
        ...actions,
        message,
        editingMessageId,
      };
    });

    act(() => {
      result.current.handleEditMessage(
        buildMessage({
          id: 'message-1',
          message: 'before edit',
          sender_name: 'Admin',
          receiver_name: 'Gudang',
        })
      );
    });

    expect(result.current.message).toBe('draft caption');
    expect(result.current.editingMessageId).toBeNull();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
    expect(clearPendingComposerAttachments).not.toHaveBeenCalled();
    expect(focusMessageComposer).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Selesaikan atau hapus lampiran draft sebelum mengedit pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('preserves a newer draft when an edit request fails after the user keeps typing', async () => {
    let resolveUpdateMessage:
      | ((value: { data: null; error: Error }) => void)
      | undefined;

    mockChatService.editTextMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveUpdateMessage = resolve;
        })
    );

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
        isComposerAttachmentLoading: false,
        closeMessageMenu,
        focusMessageComposer,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
      });

      return {
        ...actions,
        messages,
        message,
        editingMessageId,
        setMessage,
      };
    });

    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.handleSendMessage();
      await Promise.resolve();
    });

    act(() => {
      result.current.setMessage('draft baru');
    });

    await act(async () => {
      resolveUpdateMessage?.({
        data: null,
        error: new Error('update failed'),
      });
      await sendPromise;
    });

    await waitFor(() => {
      expect(result.current.messages[0]?.message).toBe('before edit');
      expect(result.current.message).toBe('draft baru');
      expect(result.current.editingMessageId).toBe(null);
    });

    expect(focusMessageComposer).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Gagal memperbarui pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('does not restore stale edit state after switching conversations', async () => {
    let resolveUpdateMessage:
      | ((value: { data: null; error: Error }) => void)
      | undefined;

    mockChatService.editTextMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveUpdateMessage = resolve;
        })
    );

    const focusMessageComposer = vi.fn();
    const closeMessageMenu = vi.fn();

    type HookProps = {
      channelId: string;
      targetUserId: string;
      targetUserName: string;
      initialMessages: ChatMessage[];
      initialDraftMessage: string;
      initialEditingMessageId: string | null;
    };

    const initialProps: HookProps = {
      channelId: 'channel-1',
      targetUserId: 'user-b',
      targetUserName: 'Gudang',
      initialMessages: [
        buildMessage({
          id: 'message-1',
          channel_id: 'channel-1',
          receiver_id: 'user-b',
          message: 'before edit',
          sender_name: 'Admin',
          receiver_name: 'Gudang',
        }),
      ],
      initialDraftMessage: 'after edit',
      initialEditingMessageId: 'message-1',
    };

    const nextProps: HookProps = {
      channelId: 'channel-2',
      targetUserId: 'user-c',
      targetUserName: 'Kasir',
      initialMessages: [
        buildMessage({
          id: 'message-2',
          channel_id: 'channel-2',
          receiver_id: 'user-c',
          message: 'new room message',
          sender_name: 'Admin',
          receiver_name: 'Kasir',
        }),
      ],
      initialDraftMessage: '',
      initialEditingMessageId: null,
    };

    const { result, rerender } = renderHook(
      (props: HookProps) => {
        const [messages, setMessages] = useState<ChatMessage[]>(
          props.initialMessages
        );
        const [message, setMessage] = useState(props.initialDraftMessage);
        const [editingMessageId, setEditingMessageId] = useState<string | null>(
          props.initialEditingMessageId
        );
        const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(
          new Map()
        );

        useEffect(() => {
          setMessages(props.initialMessages);
          setMessage(props.initialDraftMessage);
          setEditingMessageId(props.initialEditingMessageId);
        }, [
          props.channelId,
          props.initialDraftMessage,
          props.initialEditingMessageId,
          props.initialMessages,
        ]);

        const actions = useChatComposerActions({
          user: { id: 'user-a', name: 'Admin' },
          targetUser: {
            id: props.targetUserId,
            name: props.targetUserName,
            email: `${props.targetUserId}@example.com`,
            profilephoto: null,
          },
          currentChannelId: props.channelId,
          messages,
          setMessages,
          message,
          setMessage,
          editingMessageId,
          setEditingMessageId,
          pendingComposerAttachments: [],
          clearPendingComposerAttachments: vi.fn(),
          restorePendingComposerAttachments: vi.fn(),
          isComposerAttachmentLoading: false,
          closeMessageMenu,
          focusMessageComposer,
          scheduleScrollMessagesToBottom: vi.fn(),
          triggerSendSuccessGlow: vi.fn(),
          pendingImagePreviewUrlsRef,
        });

        return {
          ...actions,
          messages,
          message,
          editingMessageId,
        };
      },
      { initialProps }
    );

    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.handleSendMessage();
      await Promise.resolve();
    });

    rerender(nextProps);

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['message-2']);
      expect(result.current.message).toBe('');
      expect(result.current.editingMessageId).toBe(null);
    });

    await act(async () => {
      resolveUpdateMessage?.({
        data: null,
        error: new Error('update failed'),
      });
      await sendPromise;
    });

    expect(result.current.messages.map(messageItem => messageItem.id)).toEqual([
      'message-2',
    ]);
    expect(result.current.message).toBe('');
    expect(result.current.editingMessageId).toBe(null);
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal memperbarui pesan',
      expect.anything()
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
    mockChatService.deleteMessageThreadAndCleanup.mockResolvedValue({
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
        isComposerAttachmentLoading: false,
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
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
    expect(mockChatService.deleteMessageThreadAndCleanup).toHaveBeenCalledWith(
      'file-1'
    );
    expect(mockChatService.fetchMessagesBetweenUsers).toHaveBeenCalledWith(
      'user-b',
      expect.objectContaining({
        limit: 50,
      })
    );
    expect(mockToast.error).toHaveBeenCalledWith(
      'Gagal menghapus pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('does not hydrate a stale delete recovery into a newer conversation', async () => {
    let resolveFetchMessages:
      | ((value: { data: ChatMessage[]; error: null }) => void)
      | undefined;

    const staleAttachmentMessage = buildMessage({
      id: 'file-stale',
      channel_id: 'channel-1',
      receiver_id: 'user-b',
      message: 'https://example.com/stale.pdf',
      message_type: 'file',
      file_name: 'stale.pdf',
      file_kind: 'document',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });

    mockChatService.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: null,
      error: new Error('delete failed'),
    });
    mockChatService.fetchMessagesBetweenUsers.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFetchMessages = resolve;
        })
    );

    type HookProps = {
      channelId: string;
      targetUserId: string;
      targetUserName: string;
      initialMessages: ChatMessage[];
    };

    const { result, rerender } = renderHook(
      (props: HookProps) => {
        const [messages, setMessages] = useState<ChatMessage[]>(
          props.initialMessages
        );
        const [message, setMessage] = useState('');
        const [editingMessageId, setEditingMessageId] = useState<string | null>(
          null
        );
        const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(
          new Map()
        );

        useEffect(() => {
          setMessages(props.initialMessages);
          setMessage('');
          setEditingMessageId(null);
        }, [props.channelId, props.initialMessages]);

        const actions = useChatComposerActions({
          user: { id: 'user-a', name: 'Admin' },
          targetUser: {
            id: props.targetUserId,
            name: props.targetUserName,
            email: `${props.targetUserId}@example.com`,
            profilephoto: null,
          },
          currentChannelId: props.channelId,
          messages,
          setMessages,
          message,
          setMessage,
          editingMessageId,
          setEditingMessageId,
          pendingComposerAttachments: [],
          clearPendingComposerAttachments: vi.fn(),
          restorePendingComposerAttachments: vi.fn(),
          isComposerAttachmentLoading: false,
          closeMessageMenu: vi.fn(),
          focusMessageComposer: vi.fn(),
          scheduleScrollMessagesToBottom: vi.fn(),
          triggerSendSuccessGlow: vi.fn(),
          pendingImagePreviewUrlsRef,
        });

        return {
          ...actions,
          messages,
        };
      },
      {
        initialProps: {
          channelId: 'channel-1',
          targetUserId: 'user-b',
          targetUserName: 'Gudang',
          initialMessages: [staleAttachmentMessage],
        },
      }
    );

    let deletePromise: Promise<boolean> | undefined;
    await act(async () => {
      deletePromise = result.current.handleDeleteMessage(
        staleAttachmentMessage
      );
      await Promise.resolve();
    });

    rerender({
      channelId: 'channel-2',
      targetUserId: 'user-c',
      targetUserName: 'Kasir',
      initialMessages: [
        buildMessage({
          id: 'message-2',
          channel_id: 'channel-2',
          receiver_id: 'user-c',
          message: 'new room message',
          sender_name: 'Admin',
          receiver_name: 'Kasir',
        }),
      ],
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['message-2']);
    });

    await act(async () => {
      resolveFetchMessages?.({
        data: [staleAttachmentMessage],
        error: null,
      });
      await deletePromise;
    });

    expect(result.current.messages.map(messageItem => messageItem.id)).toEqual([
      'message-2',
    ]);
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal menghapus pesan',
      expect.anything()
    );
  });

  it('deletes the full persisted attachment thread returned by the atomic delete rpc', async () => {
    const attachmentMessage = buildMessage({
      id: 'file-atomic',
      message:
        'https://example.com/storage/v1/object/public/chat/documents/channel/report-atomic.pdf',
      message_type: 'file',
      file_name: 'report-atomic.pdf',
      file_kind: 'document',
      file_storage_path: 'documents/channel/report-atomic.pdf',
      file_preview_url:
        'https://example.com/storage/v1/object/public/chat/previews/channel/report-atomic.png',
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
    mockChatService.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: {
        deletedMessageIds: ['caption-atomic', 'file-atomic'],
        failedStoragePaths: [],
      },
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
        isComposerAttachmentLoading: false,
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
      });
    });

    await act(async () => {
      await result.current.handleDeleteMessage(attachmentMessage);
    });

    expect(mockChatService.deleteMessageThreadAndCleanup).toHaveBeenCalledWith(
      'file-atomic'
    );
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

    mockChatService.deleteMessageThreadAndCleanup.mockResolvedValue({
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
        isComposerAttachmentLoading: false,
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
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

  it('reports cleanup warnings when persisted attachment files cannot be deleted', async () => {
    const attachmentMessage = buildMessage({
      id: 'file-cleanup-warning',
      message:
        'https://example.com/storage/v1/object/public/chat/documents/channel/report-warning.pdf',
      message_type: 'file',
      file_name: 'report-warning.pdf',
      file_kind: 'document',
      file_storage_path: 'documents/channel/report-warning.pdf',
      file_preview_url:
        'https://example.com/storage/v1/object/public/chat/previews/channel/report-warning.png',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const onStorageCleanupFailure = vi.fn();

    mockChatService.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: {
        deletedMessageIds: ['file-cleanup-warning'],
        failedStoragePaths: [
          'documents/channel/report-warning.pdf',
          'previews/channel/report-warning.png',
        ],
      },
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
        isComposerAttachmentLoading: false,
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
      });
    });

    let deleteResult = false;
    await act(async () => {
      deleteResult = await result.current.handleDeleteMessage(
        attachmentMessage,
        {
          onStorageCleanupFailure,
        }
      );
    });

    expect(deleteResult).toBe(true);
    expect(onStorageCleanupFailure).toHaveBeenCalledWith([
      'documents/channel/report-warning.pdf',
      'previews/channel/report-warning.png',
    ]);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Pesan dihapus, tetapi sebagian file lampiran gagal dibersihkan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('deletes multiple threads through the batch cleanup path and restores only failed ones', async () => {
    const deletedAttachmentMessage = buildMessage({
      id: 'file-batch-1',
      message:
        'https://example.com/storage/v1/object/public/chat/documents/channel/report-batch-1.pdf',
      message_type: 'file',
      file_name: 'report-batch-1.pdf',
      file_kind: 'document',
      file_storage_path: 'documents/channel/report-batch-1.pdf',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });
    const failedAttachmentMessage = buildMessage({
      id: 'file-batch-2',
      message:
        'https://example.com/storage/v1/object/public/chat/documents/channel/report-batch-2.pdf',
      message_type: 'file',
      file_name: 'report-batch-2.pdf',
      file_kind: 'document',
      file_storage_path: 'documents/channel/report-batch-2.pdf',
      sender_name: 'Admin',
      receiver_name: 'Gudang',
    });

    mockChatService.deleteMessageThreadsAndCleanup.mockResolvedValue({
      data: {
        deletedMessageIds: ['file-batch-1'],
        deletedTargetMessageIds: ['file-batch-1'],
        failedTargetMessageIds: ['file-batch-2'],
        cleanupWarningTargetMessageIds: ['file-batch-1'],
        failedStoragePaths: ['documents/channel/report-batch-1.pdf'],
      },
      error: null,
    });
    mockChatService.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [failedAttachmentMessage],
      error: null,
    });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        deletedAttachmentMessage,
        failedAttachmentMessage,
      ]);
      const [message, setMessage] = useState('');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return {
        ...useChatComposerActions({
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
          isComposerAttachmentLoading: false,
          closeMessageMenu: vi.fn(),
          focusMessageComposer: vi.fn(),
          scheduleScrollMessagesToBottom: vi.fn(),
          triggerSendSuccessGlow: vi.fn(),
          pendingImagePreviewUrlsRef,
        }),
        messages,
      };
    });

    let deleteResult:
      | {
          deletedTargetMessageIds: string[];
          failedTargetMessageIds: string[];
          cleanupWarningTargetMessageIds: string[];
        }
      | undefined;
    await act(async () => {
      deleteResult = await result.current.handleDeleteMessages(
        [deletedAttachmentMessage, failedAttachmentMessage],
        {
          suppressErrorToast: true,
        }
      );
    });

    await waitFor(() => {
      expect(
        result.current.messages.map(messageItem => messageItem.id)
      ).toEqual(['file-batch-2']);
    });

    expect(deleteResult).toEqual({
      deletedTargetMessageIds: ['file-batch-1'],
      failedTargetMessageIds: ['file-batch-2'],
      cleanupWarningTargetMessageIds: ['file-batch-1'],
    });
    expect(mockChatService.deleteMessageThreadsAndCleanup).toHaveBeenCalledWith(
      ['file-batch-1', 'file-batch-2']
    );
    expect(mockChatService.fetchMessagesBetweenUsers).toHaveBeenCalledWith(
      'user-b',
      expect.objectContaining({
        limit: 50,
      })
    );
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
        isComposerAttachmentLoading: false,
        closeMessageMenu: vi.fn(),
        focusMessageComposer: vi.fn(),
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
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
