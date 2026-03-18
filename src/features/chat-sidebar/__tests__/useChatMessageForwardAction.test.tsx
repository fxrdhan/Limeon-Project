import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatSidebarPanelTargetUser } from '../types';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatMessageForwardAction } from '../hooks/useChatMessageForwardAction';

type ForwardUser = {
  id: string;
  name: string;
};

const {
  mockToast,
  mockPresenceRoster,
  mockMessagesGateway,
  mockCleanupGateway,
  mockAssetsGateway,
  mockPreviewGateway,
} = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  mockPresenceRoster: {
    portalOrderedUsers: [] as Array<{
      id: string;
      name: string;
      email: string;
      profilephoto: string | null;
      online_at: string;
    }>,
    isDirectoryLoading: false,
    directoryError: null as string | null,
    hasMoreDirectoryUsers: false,
    retryLoadDirectory: vi.fn(),
    loadMoreDirectoryUsers: vi.fn(),
  },
  mockMessagesGateway: {
    createMessage: vi.fn(),
  },
  mockCleanupGateway: {
    cleanupStoragePaths: vi.fn(),
    deleteMessageThreadAndCleanup: vi.fn(),
  },
  mockAssetsGateway: {
    uploadImage: vi.fn(),
    uploadAttachment: vi.fn(),
    downloadAsset: vi.fn(),
    createSignedAssetUrl: vi.fn(),
  },
  mockPreviewGateway: {
    persistPdfPreview: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/hooks/presence/usePresenceRoster', () => ({
  usePresenceRoster: () => mockPresenceRoster,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: mockMessagesGateway,
  chatSidebarCleanupGateway: mockCleanupGateway,
  chatSidebarPreviewGateway: mockPreviewGateway,
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: mockAssetsGateway,
}));

const buildUser = (overrides: Partial<ForwardUser> = {}): ForwardUser => ({
  id: overrides.id ?? 'user-a',
  name: overrides.name ?? 'Admin',
});

const buildTargetUser = (
  overrides: Partial<ChatSidebarPanelTargetUser> = {}
): ChatSidebarPanelTargetUser => ({
  id: overrides.id ?? 'user-b',
  name: overrides.name ?? 'Gudang',
  email: overrides.email ?? 'gudang@example.com',
  profilephoto: overrides.profilephoto ?? null,
});

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-b',
  receiver_id: overrides.receiver_id ?? 'user-a',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'pesan masuk',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-18T09:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-18T09:00:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? true,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  message_relation_kind: overrides.message_relation_kind,
  sender_name: overrides.sender_name ?? 'Gudang',
  receiver_name: overrides.receiver_name ?? 'Admin',
  stableKey: overrides.stableKey,
});

describe('useChatMessageForwardAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPresenceRoster.portalOrderedUsers = [
      {
        id: 'user-a',
        name: 'Admin',
        email: 'admin@example.com',
        profilephoto: null,
        online_at: '2026-03-18T09:00:00.000Z',
      },
      {
        id: 'user-b',
        name: 'Gudang',
        email: 'gudang@example.com',
        profilephoto: null,
        online_at: '2026-03-18T09:00:00.000Z',
      },
      {
        id: 'user-c',
        name: 'Kasir',
        email: 'kasir@example.com',
        profilephoto: null,
        online_at: '2026-03-18T09:00:00.000Z',
      },
    ];
    mockPresenceRoster.isDirectoryLoading = false;
    mockPresenceRoster.directoryError = null;
    mockPresenceRoster.hasMoreDirectoryUsers = false;
    mockMessagesGateway.createMessage.mockResolvedValue({
      data: buildMessage({
        id: 'persisted-1',
        sender_id: 'user-a',
        receiver_id: 'user-b',
      }),
      error: null,
    });
    mockCleanupGateway.cleanupStoragePaths.mockResolvedValue({
      data: { failedStoragePaths: [] },
      error: null,
    });
    mockCleanupGateway.deleteMessageThreadAndCleanup.mockResolvedValue({
      data: { deletedMessageIds: [], failedStoragePaths: [] },
      error: null,
    });
    mockAssetsGateway.uploadImage.mockImplementation(
      async (_file: File, storagePath: string) => ({
        path: storagePath,
      })
    );
    mockAssetsGateway.uploadAttachment.mockImplementation(
      async (_file: File, storagePath: string) => ({
        path: storagePath,
      })
    );
    mockAssetsGateway.downloadAsset.mockResolvedValue(
      new Blob(['lampiran'], { type: 'text/plain' })
    );
    mockPreviewGateway.persistPdfPreview.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('forwards text messages to every selected recipient and refreshes the current conversation when needed', async () => {
    const reconcileCurrentConversationMessages = vi
      .fn()
      .mockResolvedValue(undefined);
    const closeMessageMenu = vi.fn();

    const { result } = renderHook(() =>
      useChatMessageForwardAction({
        user: buildUser(),
        targetUser: buildTargetUser(),
        messages: [],
        closeMessageMenu,
        reconcileCurrentConversationMessages,
      })
    );

    act(() => {
      result.current.openForwardPicker(
        buildMessage({
          id: 'message-text',
          message: 'tolong cek stok',
          message_type: 'text',
        })
      );
    });

    act(() => {
      result.current.toggleForwardRecipient('user-b');
      result.current.toggleForwardRecipient('user-c');
    });

    await act(async () => {
      await result.current.submitForwardMessage();
    });

    expect(mockMessagesGateway.createMessage).toHaveBeenCalledTimes(2);
    expect(mockMessagesGateway.createMessage).toHaveBeenNthCalledWith(1, {
      receiver_id: 'user-b',
      message: 'tolong cek stok',
      message_type: 'text',
    });
    expect(mockMessagesGateway.createMessage).toHaveBeenNthCalledWith(2, {
      receiver_id: 'user-c',
      message: 'tolong cek stok',
      message_type: 'text',
    });
    expect(reconcileCurrentConversationMessages).toHaveBeenCalledOnce();
    expect(mockToast.success).toHaveBeenCalledWith(
      'Pesan berhasil diteruskan ke 2 pengguna',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.isForwardPickerOpen).toBe(false);
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('duplicates forwarded attachment uploads and recreates the attachment caption thread', async () => {
    const attachmentMessage = buildMessage({
      id: 'message-file',
      message: 'documents/channel/report.txt',
      message_type: 'file',
      file_name: 'report.txt',
      file_kind: 'document',
      file_mime_type: 'text/plain',
      file_size: 12,
      file_storage_path: 'documents/channel/report.txt',
    });
    const captionMessage = buildMessage({
      id: 'caption-1',
      message: 'catatan penting',
      message_type: 'text',
      reply_to_id: 'message-file',
      message_relation_kind: 'attachment_caption',
    });
    mockMessagesGateway.createMessage
      .mockResolvedValueOnce({
        data: buildMessage({
          id: 'forwarded-file',
          sender_id: 'user-a',
          receiver_id: 'user-c',
          message_type: 'file',
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: buildMessage({
          id: 'forwarded-caption',
          sender_id: 'user-a',
          receiver_id: 'user-c',
          message_type: 'text',
          reply_to_id: 'forwarded-file',
        }),
        error: null,
      });

    const { result } = renderHook(() =>
      useChatMessageForwardAction({
        user: buildUser(),
        targetUser: buildTargetUser(),
        messages: [attachmentMessage, captionMessage],
        closeMessageMenu: vi.fn(),
        reconcileCurrentConversationMessages: vi
          .fn()
          .mockResolvedValue(undefined),
      })
    );

    act(() => {
      result.current.openForwardPicker(attachmentMessage);
      result.current.toggleForwardRecipient('user-c');
    });

    await act(async () => {
      await result.current.submitForwardMessage();
    });

    expect(mockAssetsGateway.downloadAsset).toHaveBeenCalledWith(
      'documents/channel/report.txt'
    );
    expect(mockAssetsGateway.uploadAttachment).toHaveBeenCalledWith(
      expect.any(File),
      expect.stringContaining('documents/dm_user-a_user-c/'),
      'text/plain'
    );
    expect(mockMessagesGateway.createMessage).toHaveBeenNthCalledWith(1, {
      receiver_id: 'user-c',
      message: expect.stringContaining('documents/dm_user-a_user-c/'),
      message_type: 'file',
      file_name: 'report.txt',
      file_kind: 'document',
      file_mime_type: 'text/plain',
      file_size: 8,
      file_storage_path: expect.stringContaining('documents/dm_user-a_user-c/'),
    });
    expect(mockMessagesGateway.createMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        receiver_id: 'user-c',
        message: 'catatan penting',
        message_type: 'text',
        reply_to_id: 'forwarded-file',
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Pesan berhasil diteruskan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });
});
