import { describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { buildMessageMenuActions } from '../components/messages/messageItemUtils';

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

describe('messageItemUtils', () => {
  it('does not expose edit for temp text messages that are still sending', () => {
    const actions = buildMessageMenuActions({
      message: buildMessage({
        id: 'temp_123',
        message: 'pesan sementara',
      }),
      isCurrentUser: true,
      isImageMessage: false,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: null,
      openImageInPortal: vi.fn(),
      openDocumentInPortal: vi.fn().mockResolvedValue(undefined),
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn().mockResolvedValue(undefined),
      handleDownloadMessage: vi.fn().mockResolvedValue(undefined),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn().mockResolvedValue(true),
    });

    expect(actions.map(action => action.label)).toEqual(['Salin', 'Hapus']);
  });

  it('copies image messages using the original asset payload', async () => {
    const handleCopyMessage = vi.fn().mockResolvedValue(undefined);
    const imageMessage = buildMessage({
      message_type: 'image',
      message: 'images/channel/image.png',
      file_storage_path: 'images/channel/image.png',
      file_mime_type: 'image/png',
    });
    const actions = buildMessageMenuActions({
      message: imageMessage,
      isCurrentUser: true,
      isImageMessage: true,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: null,
      openImageInPortal: vi.fn(),
      openDocumentInPortal: vi.fn().mockResolvedValue(undefined),
      handleEditMessage: vi.fn(),
      handleCopyMessage,
      handleDownloadMessage: vi.fn().mockResolvedValue(undefined),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn().mockResolvedValue(true),
    });

    const copyAction = actions.find(action => action.label === 'Salin');
    await copyAction?.onClick();

    expect(handleCopyMessage).toHaveBeenCalledWith(imageMessage);
  });

  it('opens image messages using the original asset payload', async () => {
    const openImageInPortal = vi.fn().mockResolvedValue(undefined);
    const imageMessage = buildMessage({
      message_type: 'image',
      message: 'images/channel/image.png',
      file_storage_path: 'images/channel/image.png',
      file_mime_type: 'image/png',
    });
    const actions = buildMessageMenuActions({
      message: imageMessage,
      isCurrentUser: true,
      isImageMessage: true,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: 'Lampiran.png',
      openImageInPortal,
      openDocumentInPortal: vi.fn().mockResolvedValue(undefined),
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn().mockResolvedValue(undefined),
      handleDownloadMessage: vi.fn().mockResolvedValue(undefined),
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn().mockResolvedValue(true),
    });

    await actions.find(action => action.label === 'Buka')?.onClick();

    expect(openImageInPortal).toHaveBeenCalledWith(
      imageMessage,
      'Lampiran.png'
    );
  });

  it('shows download for image messages and downloads the original attachment', async () => {
    const handleDownloadMessage = vi.fn().mockResolvedValue(undefined);
    const imageMessage = buildMessage({
      message_type: 'image',
      message: 'images/channel/image.png',
      file_storage_path: 'images/channel/image.png',
      file_mime_type: 'image/png',
    });
    const actions = buildMessageMenuActions({
      message: imageMessage,
      isCurrentUser: true,
      isImageMessage: true,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: 'Lampiran.png',
      openImageInPortal: vi.fn(),
      openDocumentInPortal: vi.fn().mockResolvedValue(undefined),
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn().mockResolvedValue(undefined),
      handleDownloadMessage,
      handleOpenForwardMessagePicker: vi.fn(),
      handleDeleteMessage: vi.fn().mockResolvedValue(true),
    });

    expect(actions.map(action => action.label)).toEqual([
      'Buka',
      'Download',
      'Salin',
      'Teruskan',
      'Hapus',
    ]);

    await actions.find(action => action.label === 'Download')?.onClick();

    expect(handleDownloadMessage).toHaveBeenCalledWith(imageMessage);
  });

  it('adds a forward action for persisted text messages', async () => {
    const handleOpenForwardMessagePicker = vi.fn();
    const textMessage = buildMessage({
      id: 'message-99',
      message: 'teruskan ini',
      message_type: 'text',
    });
    const actions = buildMessageMenuActions({
      message: textMessage,
      isCurrentUser: false,
      isImageMessage: false,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: null,
      openImageInPortal: vi.fn(),
      openDocumentInPortal: vi.fn().mockResolvedValue(undefined),
      handleEditMessage: vi.fn(),
      handleCopyMessage: vi.fn().mockResolvedValue(undefined),
      handleDownloadMessage: vi.fn().mockResolvedValue(undefined),
      handleOpenForwardMessagePicker,
      handleDeleteMessage: vi.fn().mockResolvedValue(true),
    });

    expect(actions.map(action => action.label)).toEqual(['Salin', 'Teruskan']);

    await actions.find(action => action.label === 'Teruskan')?.onClick();

    expect(handleOpenForwardMessagePicker).toHaveBeenCalledWith(textMessage);
  });
});
