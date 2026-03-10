import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSingle,
  mockSelect,
  mockInsert,
  mockFrom,
  mockRpc,
  mockInvoke,
  mockUpdate,
  mockEq,
  mockUpdateSelect,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInvoke: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockUpdateSelect: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    functions: {
      invoke: mockInvoke,
    },
  },
  supabaseAnonKey: 'test-anon-key',
  supabaseUrl: 'https://example.supabase.co',
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
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      select: mockUpdateSelect,
    });
    mockUpdateSelect.mockResolvedValue({
      data: [],
      error: null,
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

  it('fetches conversation pages through the deterministic pagination rpc', async () => {
    const rpcMessages = [
      {
        id: 'message-3',
        created_at: '2026-03-09T10:02:00.000Z',
      },
      {
        id: 'message-2',
        created_at: '2026-03-09T10:01:00.000Z',
      },
    ];
    mockRpc.mockResolvedValueOnce({
      data: rpcMessages,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.fetchMessagesBetweenUsers('user-b', {
      beforeCreatedAt: '2026-03-09T10:03:00.000Z',
      beforeId: 'message-4',
      limit: 2,
    });

    expect(mockRpc).toHaveBeenCalledWith('fetch_chat_messages_page', {
      p_target_user_id: 'user-b',
      p_before_created_at: '2026-03-09T10:03:00.000Z',
      p_before_id: 'message-4',
      p_limit: 3,
    });
    expect(result).toEqual({
      data: {
        messages: [...rpcMessages].reverse(),
        hasMore: false,
      },
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

  it('searches conversation matches through the dedicated rpc', async () => {
    const matchedMessages = [
      {
        id: 'message-1',
        created_at: '2026-03-10T08:00:00.000Z',
      },
    ];
    mockRpc.mockResolvedValueOnce({
      data: matchedMessages,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.searchConversationMessages(
      'user-b',
      'stok',
      150
    );

    expect(mockRpc).toHaveBeenCalledWith('search_chat_messages', {
      p_target_user_id: 'user-b',
      p_query: 'stok',
      p_limit: 150,
    });
    expect(result).toEqual({
      data: matchedMessages,
      error: null,
    });
  });

  it('loads a search context window through the dedicated rpc', async () => {
    const contextMessages = [
      {
        id: 'message-10',
        created_at: '2026-03-10T08:00:00.000Z',
      },
      {
        id: 'message-11',
        created_at: '2026-03-10T08:01:00.000Z',
      },
    ];
    mockRpc.mockResolvedValueOnce({
      data: contextMessages,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.fetchConversationMessageContext(
      'user-b',
      'message-11',
      {
        beforeLimit: 12,
        afterLimit: 6,
      }
    );

    expect(mockRpc).toHaveBeenCalledWith('fetch_chat_message_context', {
      p_target_user_id: 'user-b',
      p_message_id: 'message-11',
      p_before_limit: 12,
      p_after_limit: 6,
    });
    expect(result).toEqual({
      data: contextMessages,
      error: null,
    });
  });

  it('creates chat messages through the dedicated rpc and preserves attachment metadata', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message:
          "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
      },
    });

    const { chatService } = await import('./chat.service');

    await chatService.insertMessage({
      receiver_id: 'user-b',
      message: 'caption',
      message_type: 'text',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_chat_message', {
      p_receiver_id: 'user-b',
      p_message: 'caption',
      p_message_type: 'text',
      p_reply_to_id: 'file-1',
      p_message_relation_kind: 'attachment_caption',
      p_file_name: null,
      p_file_kind: null,
      p_file_mime_type: null,
      p_file_size: null,
      p_file_storage_path: null,
    });
  });

  it('uses the edge cleanup function when deleting a thread and cleaning files', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        deletedMessageIds: ['message-1'],
        failedStoragePaths: [],
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.deleteMessageThreadAndCleanup('message-1');

    expect(mockInvoke).toHaveBeenCalledWith('chat-cleanup', {
      body: {
        action: 'delete_thread',
        messageId: 'message-1',
      },
    });
    expect(result).toEqual({
      data: {
        deletedMessageIds: ['message-1'],
        failedStoragePaths: [],
      },
      error: null,
    });
  });

  it('upserts presence through the dedicated rpc', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        user_id: 'user-a',
        is_online: true,
        last_seen: '2026-03-09T10:00:00.000Z',
        updated_at: '2026-03-09T10:00:00.000Z',
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.upsertUserPresence('user-a', {
      is_online: true,
    });

    expect(mockRpc).toHaveBeenCalledWith('upsert_user_presence', {
      p_user_id: 'user-a',
      p_is_online: true,
      p_last_chat_opened: null,
    });
    expect(result).toEqual({
      data: {
        user_id: 'user-a',
        is_online: true,
        last_seen: '2026-03-09T10:00:00.000Z',
        updated_at: '2026-03-09T10:00:00.000Z',
      },
      error: null,
    });
  });

  it('pages undelivered incoming message ids instead of loading them unbounded', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [{ id: 'message-1' }, { id: 'message-2' }, { id: 'message-3' }],
      error: null,
    });
    const mockOrderById = vi.fn().mockReturnValue({
      range: mockRange,
    });
    const mockOrderByCreatedAt = vi.fn().mockReturnValue({
      order: mockOrderById,
    });
    mockFrom.mockReturnValueOnce({
      select: mockSelect,
    });
    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    });
    mockEq
      .mockReturnValueOnce({
        eq: mockEq,
      })
      .mockReturnValueOnce({
        order: mockOrderByCreatedAt,
      });

    const { chatService } = await import('./chat.service');

    const result = await chatService.listUndeliveredIncomingMessageIds(
      'user-a',
      {
        limit: 2,
        offset: 4,
      }
    );

    expect(mockRange).toHaveBeenCalledWith(4, 6);
    expect(result).toEqual({
      data: {
        messageIds: ['message-1', 'message-2'],
        hasMore: true,
      },
      error: null,
    });
  });

  it('normalizes standard presence sync behind the rpc-based helper', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        user_id: 'user-a',
        is_online: false,
        last_seen: '2026-03-09T10:00:00.000Z',
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const didSync = await chatService.syncUserPresenceOnlineState(
      'user-a',
      false
    );

    expect(didSync).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('upsert_user_presence', {
      p_user_id: 'user-a',
      p_is_online: false,
      p_last_chat_opened: null,
    });
  });

  it('starts keepalive and fallback update through the page-exit helper', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    mockRpc.mockResolvedValueOnce({
      data: {
        user_id: 'user-a',
        is_online: false,
        last_seen: '2026-03-10T12:00:00.000Z',
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const didStartKeepalive = chatService.syncUserPresenceOnPageExit(
      'user-a',
      'access-token',
      '2026-03-10T12:00:00.000Z'
    );

    expect(didStartKeepalive).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/sync_user_presence_on_exit',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          p_user_id: 'user-a',
          p_is_online: false,
          p_last_seen: '2026-03-10T12:00:00.000Z',
        }),
      })
    );
    expect(mockRpc).toHaveBeenCalledWith('sync_user_presence_on_exit', {
      p_user_id: 'user-a',
      p_is_online: false,
      p_last_seen: '2026-03-10T12:00:00.000Z',
    });
    fetchSpy.mockRestore();
  });
});
