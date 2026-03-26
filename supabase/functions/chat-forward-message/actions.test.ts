import { describe, expect, it, vi } from 'vite-plus/test';
import {
  forwardChatMessage,
  type ChatForwardCaptionRecord,
  type ChatForwardRepository,
  type ChatForwardSourceMessageRecord,
} from './actions.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const RECIPIENT_A_ID = '33333333-3333-4333-8333-333333333333';
const RECIPIENT_B_ID = '44444444-4444-4444-8444-444444444444';

const buildTextMessage = (
  overrides: Partial<ChatForwardSourceMessageRecord> = {}
): ChatForwardSourceMessageRecord => ({
  id: overrides.id ?? MESSAGE_ID,
  sender_id: overrides.sender_id ?? RECIPIENT_A_ID,
  receiver_id: overrides.receiver_id ?? USER_ID,
  message: overrides.message ?? 'tolong cek stok',
  message_type: overrides.message_type ?? 'text',
  file_name: overrides.file_name ?? null,
  file_kind: overrides.file_kind ?? null,
  file_mime_type: overrides.file_mime_type ?? null,
  file_size: overrides.file_size ?? null,
  file_storage_path: overrides.file_storage_path ?? null,
  file_preview_url: overrides.file_preview_url ?? null,
  file_preview_page_count: overrides.file_preview_page_count ?? null,
  file_preview_status: overrides.file_preview_status ?? null,
  file_preview_error: overrides.file_preview_error ?? null,
});

const buildAttachmentMessage = (
  overrides: Partial<ChatForwardSourceMessageRecord> = {}
): ChatForwardSourceMessageRecord => ({
  ...buildTextMessage({
    message_type: 'file',
    message: 'documents/dm_user/report.pdf',
    file_name: 'report.pdf',
    file_kind: 'document',
    file_mime_type: 'application/pdf',
    file_size: 2048,
    file_storage_path: 'documents/dm_user/report.pdf',
    file_preview_url: 'previews/dm_user/report.png',
    file_preview_page_count: 2,
    file_preview_status: 'ready',
  }),
  ...overrides,
});

const buildCaption = (
  overrides: Partial<ChatForwardCaptionRecord> = {}
): ChatForwardCaptionRecord => ({
  id: overrides.id ?? 'caption-1',
  message: overrides.message ?? 'catatan penting',
});

describe('chat-forward-message actions', () => {
  it('tracks per-recipient text forwarding failures without sending user-owned fields through the repository payload', async () => {
    const insertMessage = vi.fn(async payload =>
      payload.receiver_id === RECIPIENT_A_ID
        ? {
            message: { id: 'forwarded-a' },
            error: null,
          }
        : {
            message: null,
            error: 'insert failed',
          }
    );
    const repository: ChatForwardRepository = {
      cleanupStoragePaths: vi.fn(async () => {}),
      copyStorageObject: vi.fn(async () => ({ error: null })),
      deleteMessageById: vi.fn(async () => {}),
      getAccessibleMessage: vi.fn(async () => ({
        message: buildTextMessage(),
        error: null,
      })),
      getAttachmentCaption: vi.fn(async () => ({
        caption: null,
        error: null,
      })),
      insertMessage,
    };
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const result = await forwardChatMessage({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      recipientIds: [RECIPIENT_A_ID, RECIPIENT_B_ID],
    });

    expect(result).toEqual({
      status: 200,
      body: {
        forwardedRecipientIds: [RECIPIENT_A_ID],
        failedRecipientIds: [RECIPIENT_B_ID],
      },
    });
    expect(insertMessage).toHaveBeenNthCalledWith(1, {
      receiver_id: RECIPIENT_A_ID,
      message: 'tolong cek stok',
      message_type: 'text',
    });
    expect(insertMessage).toHaveBeenNthCalledWith(2, {
      receiver_id: RECIPIENT_B_ID,
      message: 'tolong cek stok',
      message_type: 'text',
    });

    consoleErrorSpy.mockRestore();
  });

  it('forwards attachment messages and captions through repository message creation', async () => {
    const insertMessage = vi
      .fn()
      .mockResolvedValueOnce({
        message: { id: 'forwarded-parent' },
        error: null,
      })
      .mockResolvedValueOnce({
        message: { id: 'forwarded-caption' },
        error: null,
      });
    const repository: ChatForwardRepository = {
      cleanupStoragePaths: vi.fn(async () => {}),
      copyStorageObject: vi.fn(async () => ({ error: null })),
      deleteMessageById: vi.fn(async () => {}),
      getAccessibleMessage: vi.fn(async () => ({
        message: buildAttachmentMessage(),
        error: null,
      })),
      getAttachmentCaption: vi.fn(async () => ({
        caption: buildCaption(),
        error: null,
      })),
      insertMessage,
    };

    const result = await forwardChatMessage({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      recipientIds: [RECIPIENT_A_ID],
    });

    expect(result).toEqual({
      status: 200,
      body: {
        forwardedRecipientIds: [RECIPIENT_A_ID],
        failedRecipientIds: [],
      },
    });
    expect(insertMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        receiver_id: RECIPIENT_A_ID,
        message_type: 'file',
        file_name: 'report.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_size: 2048,
        file_storage_path: expect.any(String),
        file_preview_url: expect.any(String),
        file_preview_page_count: 2,
        file_preview_status: 'ready',
      })
    );
    expect(insertMessage).toHaveBeenNthCalledWith(2, {
      receiver_id: RECIPIENT_A_ID,
      message: 'catatan penting',
      message_type: 'text',
      message_relation_kind: 'attachment_caption',
      reply_to_id: 'forwarded-parent',
    });
  });

  it('rolls back copied artifacts when caption forwarding fails', async () => {
    const deleteMessageById = vi.fn(async () => {});
    const cleanupStoragePaths = vi.fn(async () => {});
    const repository: ChatForwardRepository = {
      cleanupStoragePaths,
      copyStorageObject: vi.fn(async () => ({ error: null })),
      deleteMessageById,
      getAccessibleMessage: vi.fn(async () => ({
        message: buildAttachmentMessage(),
        error: null,
      })),
      getAttachmentCaption: vi.fn(async () => ({
        caption: buildCaption(),
        error: null,
      })),
      insertMessage: vi
        .fn()
        .mockResolvedValueOnce({
          message: { id: 'forwarded-parent' },
          error: null,
        })
        .mockResolvedValueOnce({
          message: null,
          error: 'caption failed',
        }),
    };
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const result = await forwardChatMessage({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      recipientIds: [RECIPIENT_A_ID],
    });

    expect(result).toEqual({
      status: 200,
      body: {
        forwardedRecipientIds: [],
        failedRecipientIds: [RECIPIENT_A_ID],
      },
    });
    expect(deleteMessageById).toHaveBeenCalledWith('forwarded-parent');
    expect(cleanupStoragePaths).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(String)])
    );

    consoleErrorSpy.mockRestore();
  });
});
