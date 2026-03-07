import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import type { PendingComposerAttachment } from '../types';
import { useChatComposerSend } from '../hooks/useChatComposerSend';

const { mockGateway, mockToast, mockRenderPdfPreviewBlob } = vi.hoisted(() => ({
  mockGateway: {
    fetchConversationMessages: vi.fn(),
    createMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessageThread: vi.fn(),
    uploadImage: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteStorageFile: vi.fn(),
  },
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  mockRenderPdfPreviewBlob: vi.fn(),
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewBlob: mockRenderPdfPreviewBlob,
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
    mockGateway.deleteStorageFile.mockResolvedValue(undefined);
    mockRenderPdfPreviewBlob.mockResolvedValue({
      coverBlob: new Blob(['preview'], { type: 'image/png' }),
      pageCount: 2,
    });
  });

  it('rolls back the persisted attachment thread when caption insert fails', async () => {
    mockGateway.uploadAttachment.mockResolvedValue({
      path: 'documents/channel/stok.pdf',
      publicUrl: 'https://example.com/stok.pdf',
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
    mockGateway.deleteMessageThread.mockResolvedValue({
      data: ['server-file-1'],
      error: null,
    });

    const broadcastNewMessage = vi.fn();
    const broadcastUpdatedMessage = vi.fn();
    const broadcastDeletedMessage = vi.fn();
    const clearPendingComposerAttachments = vi.fn();
    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('stok opname');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useChatComposerSend({
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
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage,
        broadcastUpdatedMessage,
        broadcastDeletedMessage,
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
      expect(mockGateway.deleteMessageThread).toHaveBeenCalledWith(
        'server-file-1'
      );
      expect(mockGateway.deleteStorageFile).toHaveBeenCalledWith(
        'chat',
        'documents/channel/stok.pdf'
      );
      expect(result.current.messages).toEqual([]);
      expect(result.current.draftMessage).toBe('stok opname');
    });

    expect(broadcastNewMessage).not.toHaveBeenCalled();
    expect(broadcastUpdatedMessage).not.toHaveBeenCalled();
    expect(broadcastDeletedMessage).toHaveBeenCalledWith('server-file-1');
    expect(clearPendingComposerAttachments).toHaveBeenCalledOnce();
  });

  it('deletes orphaned preview files and marks preview metadata as failed', async () => {
    mockGateway.uploadAttachment
      .mockResolvedValueOnce({
        path: 'documents/channel/stok.pdf',
        publicUrl: 'https://example.com/stok.pdf',
      })
      .mockResolvedValueOnce({
        path: 'previews/channel/stok.png',
        publicUrl: 'https://example.com/stok.png',
      });
    mockGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'server-file-2',
        file_storage_path: 'documents/channel/stok.pdf',
        file_preview_status: 'pending',
      }),
      error: null,
    });
    mockGateway.updateMessage
      .mockResolvedValueOnce({
        data: null,
        error: new Error('preview update failed'),
      })
      .mockResolvedValueOnce({
        data: buildMessage({
          id: 'server-file-2',
          file_storage_path: 'documents/channel/stok.pdf',
          file_preview_status: 'failed',
          file_preview_error: 'Gagal menyimpan preview PDF',
        }),
        error: null,
      });

    const broadcastNewMessage = vi.fn();
    const broadcastUpdatedMessage = vi.fn();
    const { registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useChatComposerSend({
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
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage,
        broadcastUpdatedMessage,
        broadcastDeletedMessage: vi.fn(),
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
      expect(mockGateway.deleteStorageFile).toHaveBeenCalledWith(
        'chat',
        'previews/channel/stok.png'
      );
      expect(result.current.messages[0]?.file_preview_status).toBe('failed');
      expect(result.current.messages[0]?.file_preview_error).toBe(
        'Gagal menyimpan preview PDF'
      );
    });

    expect(broadcastNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'server-file-2',
      })
    );
    expect(broadcastUpdatedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'server-file-2',
        file_preview_status: 'failed',
      })
    );
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

    const broadcastNewMessage = vi.fn();
    const { pendingEntries, registerPendingSend } = createPendingSendRegistry();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [draftMessage, setDraftMessage] = useState('pesan pending');
      const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

      const send = useChatComposerSend({
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
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage,
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage: vi.fn(),
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
    expect(broadcastNewMessage).not.toHaveBeenCalled();
    expect(result.current.draftMessage).toBe('');
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

      const send = useChatComposerSend({
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
        setMessages,
        scheduleScrollMessagesToBottom: vi.fn(),
        triggerSendSuccessGlow: vi.fn(),
        broadcastNewMessage: vi.fn(),
        broadcastUpdatedMessage: vi.fn(),
        broadcastDeletedMessage: vi.fn(),
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
});
