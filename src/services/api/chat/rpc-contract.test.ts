import { describe, expect, it } from 'vite-plus/test';
import {
  CHAT_RPC_NAMES,
  buildCreateChatMessageRpcArgs,
  buildEditChatMessageTextRpcArgs,
  buildFetchChatMessageContextRpcArgs,
  buildFetchChatMessagesPageRpcArgs,
  buildListChatDirectoryUsersRpcArgs,
  buildListUndeliveredIncomingMessageIdsRpcArgs,
  buildSearchChatMessagesRpcArgs,
  buildSyncUserPresenceOnExitRpcArgs,
  buildUpsertUserPresenceRpcArgs,
} from './rpc-contract';

describe('chat RPC contracts', () => {
  it('keeps RPC names aligned with deployed database functions', () => {
    expect(CHAT_RPC_NAMES).toMatchObject({
      createMessage: 'create_chat_message',
      fetchMessagesPage: 'fetch_chat_messages_page',
      searchMessages: 'search_chat_messages',
      upsertUserPresence: 'upsert_user_presence',
    });
  });

  it('builds message page and search arguments with nullable cursors', () => {
    expect(buildFetchChatMessagesPageRpcArgs('user-2')).toEqual({
      p_before_created_at: null,
      p_before_id: null,
      p_limit: undefined,
      p_target_user_id: 'user-2',
    });

    expect(
      buildSearchChatMessagesRpcArgs('user-2', 'stok', {
        afterCreatedAt: '2026-06-13T00:00:00.000Z',
        afterId: 'message-1',
        limit: 20,
      })
    ).toEqual({
      p_after_created_at: '2026-06-13T00:00:00.000Z',
      p_after_id: 'message-1',
      p_limit: 20,
      p_query: 'stok',
      p_target_user_id: 'user-2',
    });
  });

  it('uses default context page sizes when message context limits are omitted', () => {
    expect(buildFetchChatMessageContextRpcArgs('user-2', 'message-1')).toEqual({
      p_after_limit: 20,
      p_before_limit: 20,
      p_message_id: 'message-1',
      p_target_user_id: 'user-2',
    });
  });

  it('builds create message args with explicit nulls for optional metadata', () => {
    expect(
      buildCreateChatMessageRpcArgs({
        receiver_id: 'user-2',
        message: 'invoice.pdf',
        message_type: 'file',
        file_name: 'invoice.pdf',
        file_kind: 'document',
        file_mime_type: 'application/pdf',
        file_size: 42,
      })
    ).toEqual({
      p_file_kind: 'document',
      p_file_mime_type: 'application/pdf',
      p_file_name: 'invoice.pdf',
      p_file_preview_error: null,
      p_file_preview_page_count: null,
      p_file_preview_status: null,
      p_file_preview_url: null,
      p_file_size: 42,
      p_file_storage_path: null,
      p_message: 'invoice.pdf',
      p_message_relation_kind: null,
      p_message_type: 'file',
      p_receiver_id: 'user-2',
      p_reply_to_id: null,
    });
  });

  it('builds edit and presence args with explicit optional values', () => {
    expect(
      buildEditChatMessageTextRpcArgs('message-1', {
        message: 'edited',
        updated_at: '2026-06-13T00:00:00.000Z',
      })
    ).toEqual({
      p_message: 'edited',
      p_message_id: 'message-1',
      p_updated_at: '2026-06-13T00:00:00.000Z',
    });

    expect(buildUpsertUserPresenceRpcArgs('user-1', {})).toEqual({
      p_is_online: null,
      p_last_chat_opened: null,
      p_user_id: 'user-1',
    });

    expect(
      buildSyncUserPresenceOnExitRpcArgs('user-1', {
        is_online: false,
      })
    ).toEqual({
      p_is_online: false,
      p_last_seen: null,
      p_user_id: 'user-1',
    });
  });

  it('defaults list offsets to zero while preserving provided limits', () => {
    expect(
      buildListUndeliveredIncomingMessageIdsRpcArgs({ limit: 25 })
    ).toEqual({
      p_limit: 25,
      p_offset: 0,
    });

    expect(buildListChatDirectoryUsersRpcArgs(30)).toEqual({
      p_limit: 30,
      p_offset: 0,
    });
  });
});
