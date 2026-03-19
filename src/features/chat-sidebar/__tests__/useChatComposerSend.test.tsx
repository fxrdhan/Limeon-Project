import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import type { PendingComposerAttachment } from '../types';
import { useChatComposerSend } from '../hooks/useChatComposerSend';
import { useChatMutationScope } from '../hooks/useChatMutationScope';

const { mockGateway, mockToast } = vi.hoisted(() => ({
  mockGateway: {
    fetchConversationMessages: vi.fn(),
    createMessage: vi.fn(),
    deleteMessageThread: vi.fn(),
    deleteMessageThreadAndCleanup: vi.fn(),
    persistPdfPreview: vi.fn(),
    uploadImage: vi.fn(),
    uploadAttachment: vi.fn(),
    cleanupStoragePaths: vi.fn(),
  },
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
const { mockCreatePdfPreviewUploadArtifact, mockReadBlobAsDataUrl } =
  vi.hoisted(() => ({
    mockCreatePdfPreviewUploadArtifact: vi.fn(),
    mockReadBlobAsDataUrl: vi.fn(),
  }));
const { mockRemoteAssetService } = vi.hoisted(() => ({
  mockRemoteAssetService: {
    fetchRemoteAsset: vi.fn(),
  },
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: {
    fetchMessagesBetweenUsers: mockGateway.fetchConversationMessages,
    insertMessage: mockGateway.createMessage,
    deleteMessageThread: mockGateway.deleteMessageThread,
  },
  chatCleanupService: {
    deleteMessageThreadAndCleanup: mockGateway.deleteMessageThreadAndCleanup,
    cleanupStoragePaths: mockGateway.cleanupStoragePaths,
  },
  chatPreviewService: {
    persistPdfPreview: mockGateway.persistPdfPreview,
  },
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: {
    uploadImage: mockGateway.uploadImage,
    uploadAttachment: mockGateway.uploadAttachment,
  },
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

vi.mock('../utils/pdf-message-preview', async () => {
  const actual = await vi.importActual('../utils/pdf-message-preview');

  return {
    ...actual,
    createPdfPreviewUploadArtifact: mockCreatePdfPreviewUploadArtifact,
    readBlobAsDataUrl: mockReadBlobAsDataUrl,
  };
});

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'https://example.com/file.pdf',
  message_type: overrides.message_type ?? 'file',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  message_relation_kind: overrides.message_relation_kind ?? null,
  file_name: overrides.file_name ?? 'stok.pdf',
  file_kind: overrides.file_kind ?? 'document',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_size: overrides.file_size ?? 2048,
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/stok.pdf',
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

const buildPendingAttachment = (
  overrides: Partial<PendingComposerAttachment> = {}
): PendingComposerAttachment => ({
  id: overrides.id ?? 'pending-1',
  file:
    overrides.file ??
    new File(['pdf'], 'stok.pdf', { type: 'application/pdf' }),
  fileName: overrides.fileName ?? 'stok.pdf',
  fileTypeLabel: overrides.fileTypeLabel ?? 'PDF',
  fileKind: overrides.fileKind ?? 'document',
  mimeType: overrides.mimeType ?? 'application/pdf',
  previewUrl: overrides.previewUrl ?? 'blob:pending-preview',
  pdfCoverUrl: overrides.pdfCoverUrl ?? null,
});

const createPendingSendRegistry = () => {
  const pendingEntries = new Map<string, { cancelled: boolean }>();

  return {
    pendingEntries,
    registerPendingSend: (tempMessageId: string) => {
      const entry = { cancelled: false };
      pendingEntries.set(tempMessageId, entry);

      return {
        complete: () => {
          const currentEntry = pendingEntries.get(tempMessageId);
          if (currentEntry === entry) {
            pendingEntries.delete(tempMessageId);
          }
        },
        isCancelled: () => entry.cancelled,
      };
    },
  };
};

const useComposerSendWithMutationScope = ({
  messages = [],
  rawEmbeddedLinkUrl = null,
  ...props
}: Omit<
  Parameters<typeof useChatComposerSend>[0],
  'mutationScope' | 'rawEmbeddedLinkUrl'
> & {
  messages?: ChatMessage[];
  rawEmbeddedLinkUrl?: string | null;
}) => {
  const mutationScope = useChatMutationScope({
    user: props.user,
    targetUser: props.targetUser,
    currentChannelId: props.currentChannelId,
    messages,
    setMessages: props.setMessages,
  });

  return useChatComposerSend({
    ...props,
    rawEmbeddedLinkUrl,
    mutationScope,
  });
};

describe('useChatComposerSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi
          .fn()
          .mockReturnValueOnce('blob:temp-upload')
          .mockReturnValueOnce('blob:preview-upload'),
        revokeObjectURL: vi.fn(),
      })
    );
    mockGateway.fetchConversationMessages.mockResolvedValue({
      data: [],
      error: null,
    });
    mockGateway.cleanupStoragePaths.mockResolvedValue({
      data: {
        failedStoragePaths: [],
      },
      error: null,
    });
    mockCreatePdfPreviewUploadArtifact.mockResolvedValue({
      previewFile: new File(['preview'], 'server-file-preview.png', {
        type: 'image/png',
      }),
      pageCount: 2,
    });
    mockReadBlobAsDataUrl.mockResolvedValue(
      'data:image/png;base64,cHJldmlldw=='
    );
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: null,
      error: null,
    });
    mockGateway.persistPdfPreview.mockImplementation(
      async ({ message_id }: { message_id: string }) => ({
        data: {
          previewPersisted: true,
          message: buildMessage({
            id: message_id,
            file_preview_status: 'ready',
            file_preview_url: 'previews/channel/server-file-preview.png',
            file_preview_page_count: 2,
          }),
        },
        error: null,
      })
    );
  });

  it('rolls back the persisted attachment thread when caption insert fails', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel/stok.pdf',
    });
    mockGateway.createMessage
      .mockResolvedValueOnce({
        data: buildMessage({
          id: 'server-file-1',
          file_storage_path: 'documents/channel/stok.pdf',
          file_preview_status: 'pending',
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error('caption failed'),
      });
    mockGateway.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: {
        deletedMessageIds: ['server-file-1'],
        failedStoragePaths: [],
      },
      error: null,
    });

    const clearPendingComposerAttachments = vi.fn();
    const restorePendingComposerAttachments = vi.fn();
    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('stok opname');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [buildPendingAttachment()],
        clearPendingComposerAttachments,
        restorePendingComposerAttachments,
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        draftMessage,
        setMessages,
      };
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(mockGateway.deleteMessageThreadAndCleanup).toHaveBeenCalledWith(
        'server-file-1'
      );
      expect(result.current.messages).toEqual([]);
      expect(result.current.draftMessage).toBe('stok opname');
    });

    expect(clearPendingComposerAttachments).toHaveBeenCalledOnce();
    expect(mockGateway.createMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
        reply_to_id: 'server-file-1',
      })
    );
    expect(restorePendingComposerAttachments).toHaveBeenCalledWith([
      expect.objectContaining({
        fileName: 'stok.pdf',
      }),
    ]);
  });

  it('restores the failed attachment slice back into the composer when send fails', async () => {
    mockGateway.uploadAttachment.mockRejectedValue(new Error('upload failed'));

    const restorePendingComposerAttachments = vi.fn();
    const firstAttachment = buildPendingAttachment({
      id: 'pending-1',
      fileName: 'stok-1.pdf',
    });
    const secondAttachment = buildPendingAttachment({
      id: 'pending-2',
      fileName: 'stok-2.pdf',
    });
    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [firstAttachment, secondAttachment],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments,
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(restorePendingComposerAttachments).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'pending-1', fileName: 'stok-1.pdf' }),
      expect.objectContaining({ id: 'pending-2', fileName: 'stok-2.pdf' }),
    ]);
  });

  it('surfaces a cleanup warning when an uncommitted uploaded file cannot be deleted', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel/stok.pdf',
    });
    mockGateway.createMessage.mockResolvedValue({
      data: null,
      error: new Error('insert failed'),
    });
    mockGateway.cleanupStoragePaths.mockResolvedValue({
      data: {
        failedStoragePaths: ['documents/channel/stok.pdf'],
      },
      error: null,
    });

    const clearPendingComposerAttachments = vi.fn();
    const restorePendingComposerAttachments = vi.fn();
    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [buildPendingAttachment()],
        clearPendingComposerAttachments,
        restorePendingComposerAttachments,
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(mockGateway.cleanupStoragePaths).toHaveBeenCalledWith([
      'documents/channel/stok.pdf',
    ]);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Pengiriman gagal dan file sementara tidak dapat dibersihkan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('does nothing when attachment send is triggered without an active channel', async () => {
    const clearPendingComposerAttachments = vi.fn();
    const restorePendingComposerAttachments = vi.fn();
    const { registerPendingSend, pendingEntries } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: null,
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [buildPendingAttachment()],
        clearPendingComposerAttachments,
        restorePendingComposerAttachments,
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(clearPendingComposerAttachments).not.toHaveBeenCalled();
    expect(restorePendingComposerAttachments).not.toHaveBeenCalled();
    expect(mockGateway.uploadAttachment).not.toHaveBeenCalled();
    expect(mockGateway.createMessage).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(pendingEntries.size).toBe(0);
  });

  it('persists pdf preview metadata during the send pipeline', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel/stok.pdf',
    });
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-file-2',
        file_storage_path: 'documents/channel/stok.pdf',
      }),
      error: null,
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [buildPendingAttachment()],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
      };
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(mockGateway.uploadAttachment).toHaveBeenCalledTimes(1);
    expect(mockGateway.cleanupStoragePaths).not.toHaveBeenCalled();
    expect(mockCreatePdfPreviewUploadArtifact).toHaveBeenCalledTimes(1);
    expect(mockCreatePdfPreviewUploadArtifact).toHaveBeenCalledWith(
      expect.any(File),
      'server-file-2'
    );
    expect(mockGateway.persistPdfPreview).toHaveBeenCalledTimes(1);
    expect(mockGateway.persistPdfPreview).toHaveBeenCalledWith({
      message_id: 'server-file-2',
      preview_png_base64: 'cHJldmlldw==',
      page_count: 2,
    });
    expect(result.current.messages[0]?.file_preview_status).toBe('ready');
    expect(result.current.messages[0]?.file_preview_url).toBe(
      'previews/channel/server-file-preview.png'
    );
    expect(result.current.messages[0]?.file_preview_page_count).toBe(2);
  });

  it('cancels a temp text send instead of letting the persisted row reappear', async () => {
    let resolveCreateMessage:
      | ((value: { data: ChatMessage; error: null }) => void)
      | undefined;

    mockGateway.createMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreateMessage = resolve;
        })
    );
    mockGateway.deleteMessageThread.mockResolvedValue({
      data: ['server-text-1'],
      error: null,
    });

    const { pendingEntries, registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('pesan pending');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        draftMessage,
        setMessages,
      };
    });

    await act(async () => {
      const sendPromise = result.current.handleSendMessage();
      await Promise.resolve();

      const tempMessageId = pendingEntries.keys().next().value as
        | string
        | undefined;
      expect(tempMessageId).toBeDefined();
      pendingEntries.get(tempMessageId!)!.cancelled = true;
      result.current.setMessages(previousMessages =>
        previousMessages.filter(messageItem => messageItem.id !== tempMessageId)
      );

      resolveCreateMessage?.({
        data: buildMessage({
          id: 'server-text-1',
          message: 'pesan pending',
          message_type: 'text',
        }),
        error: null,
      });

      await sendPromise;
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([]);
    });

    expect(mockGateway.deleteMessageThread).toHaveBeenCalledWith(
      'server-text-1'
    );
    expect(result.current.draftMessage).toBe('');
  });

  it('reconciles a cancelled temp text send when rollback cleanup fails', async () => {
    let resolveCreateMessage:
      | ((value: { data: ChatMessage; error: null }) => void)
      | undefined;

    const persistedTextMessage = buildMessage({
      id: 'server-text-rollback-fail',
      message: 'pesan pending',
      message_type: 'text',
    });

    mockGateway.createMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreateMessage = resolve;
        })
    );
    mockGateway.deleteMessageThread.mockResolvedValue({
      data: null,
      error: new Error('delete failed'),
    });
    mockGateway.fetchConversationMessages.mockResolvedValue({
      data: [persistedTextMessage],
      error: null,
    });

    const { pendingEntries, registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('pesan pending');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        draftMessage,
        setMessages,
      };
    });

    await act(async () => {
      const sendPromise = result.current.handleSendMessage();
      await Promise.resolve();

      const tempMessageId = pendingEntries.keys().next().value as
        | string
        | undefined;
      expect(tempMessageId).toBeDefined();
      pendingEntries.get(tempMessageId!)!.cancelled = true;
      result.current.setMessages(previousMessages =>
        previousMessages.filter(messageItem => messageItem.id !== tempMessageId)
      );

      resolveCreateMessage?.({
        data: persistedTextMessage,
        error: null,
      });

      await sendPromise;
    });

    await waitFor(() => {
      expect(mockGateway.fetchConversationMessages).toHaveBeenCalledWith(
        'user-b',
        expect.objectContaining({
          limit: 50,
        })
      );
      expect(result.current.messages).toEqual([
        expect.objectContaining({
          id: 'server-text-rollback-fail',
          message: 'pesan pending',
          message_type: 'text',
        }),
      ]);
    });

    expect(result.current.draftMessage).toBe('');
  });

  it('reconciles the persisted attachment thread when cancellation rollback fails', async () => {
    let resolveCreateMessage:
      | ((value: { data: ChatMessage; error: null }) => void)
      | undefined;

    const persistedImageMessage = buildMessage({
      id: 'server-image-rollback-fail',
      message: 'images/channel/chat.png',
      message_type: 'image',
      file_name: undefined,
      file_kind: undefined,
      file_mime_type: 'image/png',
      file_size: 1024,
      file_storage_path: 'images/channel/chat.png',
    });

    mockGateway.uploadImage.mockResolvedValue({
      path: 'images/channel/chat.png',
    });
    mockGateway.createMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreateMessage = resolve;
        })
    );
    mockGateway.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: null,
      error: new Error('delete failed'),
    });
    mockGateway.fetchConversationMessages.mockResolvedValue({
      data: [persistedImageMessage],
      error: null,
    });

    const { pendingEntries, registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [
          buildPendingAttachment({
            id: 'pending-image-1',
            file: new File(['image'], 'chat.png', { type: 'image/png' }),
            fileName: 'chat.png',
            fileTypeLabel: 'PNG',
            fileKind: 'image',
            mimeType: 'image/png',
            previewUrl: 'blob:image-preview',
          }),
        ],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        setMessages,
      };
    });

    await act(async () => {
      const sendPromise = result.current.handleSendMessage();
      await waitFor(() => {
        expect(mockGateway.createMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            receiver_id: 'user-b',
            message: expect.stringMatching(
              /^images\/channel-1\/user-a_image_.+\.png$/
            ),
            message_type: 'image',
            file_storage_path: expect.stringMatching(
              /^images\/channel-1\/user-a_image_.+\.png$/
            ),
          })
        );
      });

      const tempMessageId = pendingEntries.keys().next().value as
        | string
        | undefined;
      expect(tempMessageId).toBeDefined();
      pendingEntries.get(tempMessageId!)!.cancelled = true;
      result.current.setMessages(previousMessages =>
        previousMessages.filter(messageItem => messageItem.id !== tempMessageId)
      );

      resolveCreateMessage?.({
        data: persistedImageMessage,
        error: null,
      });

      await sendPromise;
    });

    await waitFor(() => {
      expect(mockGateway.deleteMessageThreadAndCleanup).toHaveBeenCalledWith(
        'server-image-rollback-fail'
      );
      expect(mockGateway.fetchConversationMessages).toHaveBeenCalledWith(
        'user-b',
        expect.objectContaining({
          limit: 50,
        })
      );
      expect(result.current.messages).toEqual([
        expect.objectContaining({
          id: 'server-image-rollback-fail',
          message: 'images/channel/chat.png',
          message_type: 'image',
        }),
      ]);
    });
  });

  it('does not restore stale draft state after switching conversations during a failed text send', async () => {
    let resolveCreateMessage:
      | ((value: { data: null; error: Error }) => void)
      | undefined;

    mockGateway.createMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreateMessage = resolve;
        })
    );
    const { registerPendingSend } = createPendingSendRegistry();

    type HookProps = {
      channelId: string;
      targetUserId: string;
      targetUserName: string;
      initialDraftMessage: string;
      initialMessages: ChatMessage[];
    };

    const initialProps: HookProps = {
      channelId: 'channel-1',
      targetUserId: 'user-b',
      targetUserName: 'Gudang',
      initialDraftMessage: 'draft lama',
      initialMessages: [],
    };

    const nextProps: HookProps = {
      channelId: 'channel-2',
      targetUserId: 'user-c',
      targetUserName: 'Kasir',
      initialDraftMessage: '',
      initialMessages: [],
    };

    const { result, rerender } = renderHook(
      (props: HookProps) => {
        const [messages, setMessages] = useState<ChatMessage[]>(
          props.initialMessages
        );
        const [draftMessage, setDraftMessage] = useState(
          props.initialDraftMessage
        );
        const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(
          new Map()
        );

        useEffect(() => {
          setMessages(props.initialMessages);
          setDraftMessage(props.initialDraftMessage);
        }, [props.channelId, props.initialDraftMessage, props.initialMessages]);

        const send = useComposerSendWithMutationScope({
          user: { id: 'user-a', name: 'Admin' },
          targetUser: {
            id: props.targetUserId,
            name: props.targetUserName,
            email: `${props.targetUserId}@example.com`,
            profilephoto: null,
          },
          currentChannelId: props.channelId,
          message: draftMessage,
          setMessage: setDraftMessage,
          editingMessageId: null,
          pendingComposerAttachments: [],
          clearPendingComposerAttachments: vi.fn(),
          restorePendingComposerAttachments: vi.fn(),
          setMessages,
          scheduleScrollMessagesToBottom: vi.fn(),
          triggerSendSuccessGlow: vi.fn(),
          pendingImagePreviewUrlsRef,
          registerPendingSend,
        });

        return {
          ...send,
          messages,
          draftMessage,
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
      expect(result.current.draftMessage).toBe('');
      expect(result.current.messages).toEqual([]);
    });

    await act(async () => {
      resolveCreateMessage?.({
        data: null,
        error: new Error('insert failed'),
      });
      await sendPromise;
    });

    expect(result.current.draftMessage).toBe('');
    expect(result.current.messages).toEqual([]);
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal mengirim pesan',
      expect.anything()
    );
  });

  it('shows an error toast and restores draft text when text send fails', async () => {
    mockGateway.createMessage.mockResolvedValue({
      data: null,
      error: new Error('insert failed'),
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('pesan gagal');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        draftMessage,
      };
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.draftMessage).toBe('pesan gagal');
    expect(mockToast.error).toHaveBeenCalledWith('Gagal mengirim pesan', {
      toasterId: 'chat-sidebar-toaster',
    });
  });

  it('preserves a newer draft when text send fails after the user keeps typing', async () => {
    let resolveCreateMessage:
      | ((value: { data: null; error: Error }) => void)
      | undefined;

    mockGateway.createMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreateMessage = resolve;
        })
    );

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('pesan gagal');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });

      return {
        ...send,
        messages,
        draftMessage,
        setDraftMessage,
      };
    });

    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.handleSendMessage();
      await Promise.resolve();
    });

    act(() => {
      result.current.setDraftMessage('draft baru');
    });

    await act(async () => {
      resolveCreateMessage?.({
        data: null,
        error: new Error('insert failed'),
      });
      await sendPromise;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.draftMessage).toBe('draft baru');
    expect(mockToast.error).toHaveBeenCalledWith('Gagal mengirim pesan', {
      toasterId: 'chat-sidebar-toaster',
    });
  });

  it('converts a pasted image url draft into an image attachment send', async () => {
    mockGateway.uploadImage.mockResolvedValue({
      path: 'images/channel-1/user-a_image_embedded.png',
    });
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-image-embedded',
        message: 'images/channel-1/user-a_image_embedded.png',
        message_type: 'image',
        file_name: undefined,
        file_kind: undefined,
        file_mime_type: 'image/png',
        file_storage_path: 'images/channel-1/user-a_image_embedded.png',
      }),
      error: null,
    });
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['image'], { type: 'image/png' }),
        contentDisposition: null,
        contentType: 'image/png',
        sourceUrl: 'https://example.com/embed/receipt.png',
      },
      error: null,
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState(
        'https://example.com/embed/receipt.png'
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(mockGateway.uploadImage).toHaveBeenCalledWith(
        expect.any(File),
        expect.stringMatching(/^images\/channel-1\/user-a_image_.+\.png$/)
      );
    });

    expect(mockGateway.uploadAttachment).not.toHaveBeenCalled();
    expect(mockGateway.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        receiver_id: 'user-b',
        message_type: 'image',
        file_storage_path: expect.stringMatching(
          /^images\/channel-1\/user-a_image_.+\.png$/
        ),
      })
    );
  });

  it('sends a pasted image url as plain text when the draft is marked to stay raw', async () => {
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-text-url',
        message: 'https://example.com/embed/receipt.png',
        message_type: 'text',
        file_name: undefined,
        file_kind: undefined,
        file_mime_type: undefined,
        file_storage_path: undefined,
      }),
      error: null,
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState(
        'https://example.com/embed/receipt.png'
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        rawEmbeddedLinkUrl: 'https://example.com/embed/receipt.png',
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(mockRemoteAssetService.fetchRemoteAsset).not.toHaveBeenCalled();
    expect(mockGateway.uploadImage).not.toHaveBeenCalled();
    expect(mockGateway.uploadAttachment).not.toHaveBeenCalled();
    expect(mockGateway.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        receiver_id: 'user-b',
        message: 'https://example.com/embed/receipt.png',
        message_type: 'text',
      })
    );
  });

  it('converts a pdf embed draft into a document attachment send', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel-1/user-a_document_embedded.pdf',
    });
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-file-embedded',
        message: 'documents/channel-1/user-a_document_embedded.pdf',
        message_type: 'file',
        file_name: 'invoice.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel-1/user-a_document_embedded.pdf',
      }),
      error: null,
    });
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['pdf'], { type: 'application/pdf' }),
        contentDisposition: 'attachment; filename="invoice.pdf"',
        contentType: 'application/pdf',
        sourceUrl: 'https://example.com/embed/invoice',
      },
      error: null,
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState(
        '<iframe src="https://example.com/embed/invoice"></iframe>'
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(mockGateway.uploadAttachment).toHaveBeenCalledWith(
        expect.any(File),
        expect.stringMatching(
          /^documents\/channel-1\/user-a_document_.+\.pdf$/
        ),
        'application/pdf'
      );
    });

    expect(mockGateway.uploadImage).not.toHaveBeenCalled();
    expect(mockGateway.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        receiver_id: 'user-b',
        message_type: 'file',
        file_name: 'invoice.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_storage_path: expect.stringMatching(
          /^documents\/channel-1\/user-a_document_.+\.pdf$/
        ),
      })
    );
  });

  it('converts a google drive pdf url draft into a document attachment send', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel-1/user-a_document_embedded.pdf',
    });
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-file-drive',
        message: 'documents/channel-1/user-a_document_embedded.pdf',
        message_type: 'file',
        file_name: 'invoice.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_storage_path: 'documents/channel-1/user-a_document_embedded.pdf',
      }),
      error: null,
    });
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['%PDF-1.4\n1 0 obj\n<</Title (Job Desk Minggu 4)>>'], {
          type: 'application/octet-stream',
        }),
        contentDisposition: null,
        contentType: 'application/octet-stream',
        sourceUrl:
          'https://drive.google.com/uc?export=download&id=113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH',
      },
      error: null,
    });

    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState(
        'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
      );
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      return useComposerSendWithMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        message: draftMessage,
        setMessage: setDraftMessage,
        editingMessageId: null,
        pendingComposerAttachments: [],
        clearPendingComposerAttachments: vi.fn(),
        restorePendingComposerAttachments: vi.fn(),
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        pendingImagePreviewUrlsRef,
        registerPendingSend,
      });
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(mockRemoteAssetService.fetchRemoteAsset).toHaveBeenCalledWith(
      'https://drive.google.com/uc?export=download&id=113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH',
      {
        fileNameSourceUrl:
          'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
      }
    );

    await waitFor(() => {
      expect(mockGateway.uploadAttachment).toHaveBeenCalledWith(
        expect.any(File),
        expect.stringMatching(
          /^documents\/channel-1\/user-a_document_.+\.pdf$/
        ),
        'application/pdf'
      );
    });

    expect(mockGateway.uploadImage).not.toHaveBeenCalled();
    expect(mockGateway.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        receiver_id: 'user-b',
        message_type: 'file',
        file_name: 'Job Desk Minggu 4.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_storage_path: expect.stringMatching(
          /^documents\/channel-1\/user-a_document_.+\.pdf$/
        ),
      })
    );
  });
});
