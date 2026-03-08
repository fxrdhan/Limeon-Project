import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSingle, mockSelect, mockEq, mockInsert, mockUpdate, mockFrom } =
  vi.hoisted(() => ({
    mockSingle: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockFrom: vi.fn(),
  }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

describe('chatService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
  });

  it('fails fast when inserts reference message_relation_kind but the schema is missing it', async () => {
    const schemaError = {
      message:
        "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
    };
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: schemaError,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.insertMessage({
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'channel-1',
      message: 'caption',
      message_type: 'text',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(result.data).toBeNull();
    expect(result.error).toBe(schemaError);
  });

  it('fails fast when updates reference message_relation_kind but the schema is missing it', async () => {
    const schemaError = {
      message:
        "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
    };
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: schemaError,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.updateMessage('caption-1', {
      message_relation_kind: 'attachment_caption',
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(result.data).toBeNull();
    expect(result.error).toBe(schemaError);
  });
});
