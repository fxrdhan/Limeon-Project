import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatSidebarPanelTargetUser } from '../types';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatMessageForwardAction } from '../hooks/useChatMessageForwardAction';

type ForwardUser = {
  id: string;
  name: string;
};

const { mockToast, mockDirectoryRoster, mockForwardGateway } = vi.hoisted(
  () => ({
    mockToast: {
      error: vi.fn(),
      success: vi.fn(),
    },
    mockDirectoryRoster: {
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
    mockForwardGateway: {
      forwardMessage: vi.fn(),
    },
  })
);

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../hooks/useChatDirectoryRoster', () => ({
  useChatDirectoryRoster: () => mockDirectoryRoster,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarForwardGateway: mockForwardGateway,
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
    mockDirectoryRoster.portalOrderedUsers = [
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
    mockDirectoryRoster.isDirectoryLoading = false;
    mockDirectoryRoster.directoryError = null;
    mockDirectoryRoster.hasMoreDirectoryUsers = false;
    mockForwardGateway.forwardMessage.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('forwards text messages through the backend gateway and refreshes the current conversation when needed', async () => {
    const reconcileCurrentConversationMessages = vi
      .fn()
      .mockResolvedValue(undefined);
    const closeMessageMenu = vi.fn();
    mockForwardGateway.forwardMessage.mockResolvedValueOnce({
      data: {
        forwardedRecipientIds: ['user-b', 'user-c'],
        failedRecipientIds: [],
      },
      error: null,
    });

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

    expect(mockForwardGateway.forwardMessage).toHaveBeenCalledWith({
      messageId: 'message-text',
      recipientIds: ['user-b', 'user-c'],
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

  it('forwards attachment threads through the backend forwarding gateway', async () => {
    mockForwardGateway.forwardMessage.mockResolvedValueOnce({
      data: {
        forwardedRecipientIds: ['user-c'],
        failedRecipientIds: [],
      },
      error: null,
    });
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

    expect(mockForwardGateway.forwardMessage).toHaveBeenCalledWith({
      messageId: 'message-file',
      recipientIds: ['user-c'],
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      'Pesan berhasil diteruskan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
  });

  it('surfaces a toast and keeps the picker open when forwarding fails', async () => {
    mockForwardGateway.forwardMessage.mockResolvedValueOnce({
      data: null,
      error: new Error('gateway down'),
    });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useChatMessageForwardAction({
        user: buildUser(),
        targetUser: buildTargetUser(),
        messages: [],
        closeMessageMenu: vi.fn(),
        reconcileCurrentConversationMessages: vi
          .fn()
          .mockResolvedValue(undefined),
      })
    );

    act(() => {
      result.current.openForwardPicker(
        buildMessage({
          id: 'message-error',
          message: 'tolong cek stok',
          message_type: 'text',
        })
      );
      result.current.toggleForwardRecipient('user-b');
    });

    await act(async () => {
      await result.current.submitForwardMessage();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Gagal meneruskan pesan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.isForwardPickerOpen).toBe(true);
    expect(result.current.selectedForwardRecipientIds).toEqual(
      new Set(['user-b'])
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to forward chat message',
      expect.objectContaining({
        messageId: 'message-error',
        recipientIds: ['user-b'],
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('keeps the forward flow successful when conversation reconciliation fails after a successful submit', async () => {
    mockForwardGateway.forwardMessage.mockResolvedValueOnce({
      data: {
        forwardedRecipientIds: ['user-b'],
        failedRecipientIds: [],
      },
      error: null,
    });
    const reconcileCurrentConversationMessages = vi
      .fn()
      .mockRejectedValue(new Error('stale view'));
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useChatMessageForwardAction({
        user: buildUser(),
        targetUser: buildTargetUser(),
        messages: [],
        closeMessageMenu: vi.fn(),
        reconcileCurrentConversationMessages,
      })
    );

    act(() => {
      result.current.openForwardPicker(
        buildMessage({
          id: 'message-reconcile',
          message: 'tolong cek stok',
          message_type: 'text',
        })
      );
      result.current.toggleForwardRecipient('user-b');
    });

    await act(async () => {
      await result.current.submitForwardMessage();
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Pesan berhasil diteruskan',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.isForwardPickerOpen).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to reconcile current conversation after forwarding chat message',
      expect.objectContaining({
        messageId: 'message-reconcile',
        targetUserId: 'user-b',
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
