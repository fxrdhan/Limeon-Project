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

  it('retries inserts without message_relation_kind when the database schema is still old', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'caption-1',
          sender_id: 'user-a',
          receiver_id: 'user-b',
          channel_id: 'channel-1',
          message: 'caption',
          message_type: 'text',
          reply_to_id: 'file-1',
        },
        error: null,
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

    expect(mockInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(mockInsert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('caption-1');
  });

  it('does not keep stripping message_relation_kind after a prior fallback insert', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'caption-legacy',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'caption-supported',
          message_relation_kind: 'attachment_caption',
        },
        error: null,
      });

    const { chatService } = await import('./chat.service');

    await chatService.insertMessage({
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'channel-1',
      message: 'caption legacy',
      message_type: 'text',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });

    const result = await chatService.insertMessage({
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'channel-1',
      message: 'caption supported',
      message_type: 'text',
      reply_to_id: 'file-2',
      message_relation_kind: 'attachment_caption',
    });

    expect(mockInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(mockInsert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(mockInsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      id: 'caption-supported',
      message_relation_kind: 'attachment_caption',
    });
  });

  it('retries updates without message_relation_kind when the database schema is still old', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'caption-1',
          message_relation_kind: null,
        },
        error: null,
      });

    const { chatService } = await import('./chat.service');

    const result = await chatService.updateMessage('caption-1', {
      message_relation_kind: 'attachment_caption',
    });

    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        message_relation_kind: 'attachment_caption',
      })
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      id: 'caption-1',
      message_relation_kind: null,
    });
  });
});
