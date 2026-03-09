import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSingle, mockSelect, mockInsert, mockFrom, mockRpc } = vi.hoisted(
  () => ({
    mockSingle: vi.fn(),
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
  })
);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe('chatService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
  });

  it('edits text messages through the dedicated rpc', async () => {
    const updatedMessage = {
      id: 'message-1',
      message: 'edited caption',
    };
    mockRpc.mockResolvedValueOnce({
      data: updatedMessage,
      error: null,
    });
    const { chatService } = await import('./chat.service');

    const result = await chatService.editTextMessage('message-1', {
      message: 'edited caption',
      updated_at: '2026-03-09T10:00:00.000Z',
    });

    expect(mockRpc).toHaveBeenCalledWith('edit_chat_message_text', {
      p_message_id: 'message-1',
      p_message: 'edited caption',
      p_updated_at: '2026-03-09T10:00:00.000Z',
    });
    expect(result).toEqual({
      data: updatedMessage,
      error: null,
    });
  });

  it('updates file preview metadata through the dedicated rpc', async () => {
    const updatedMessage = {
      id: 'file-1',
      file_preview_status: 'ready',
      file_preview_url: 'previews/channel/file.png',
      file_preview_page_count: 2,
      file_preview_error: null,
    };
    mockRpc.mockResolvedValueOnce({
      data: updatedMessage,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.updateFilePreview('file-1', {
      file_preview_status: 'ready',
      file_preview_url: 'previews/channel/file.png',
      file_preview_page_count: 2,
      file_preview_error: null,
    });

    expect(mockRpc).toHaveBeenCalledWith('update_chat_file_preview_metadata', {
      p_message_id: 'file-1',
      p_file_preview_url: 'previews/channel/file.png',
      p_file_preview_page_count: 2,
      p_file_preview_status: 'ready',
      p_file_preview_error: null,
    });
    expect(result).toEqual({
      data: updatedMessage,
      error: null,
    });
  });

  it('still persists attachment captions with message_relation_kind on insert', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        message:
          "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
      },
    });

    const { chatService } = await import('./chat.service');

    await chatService.insertMessage({
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'channel-1',
      message: 'caption',
      message_type: 'text',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
  });
});
