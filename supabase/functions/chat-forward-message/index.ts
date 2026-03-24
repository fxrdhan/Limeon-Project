import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { ChatForwardMessageRequestPayload } from '../../../shared/chatFunctionContracts.ts';
import {
  forwardChatMessage,
  type ChatForwardRepository,
} from './actions.ts';

const CHAT_BUCKET = 'chat';

const buildCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get('Origin');
  const accessControlAllowOrigin =
    requestOrigin && requestOrigin.length > 0 ? requestOrigin : '*';

  return {
    'Access-Control-Allow-Origin': accessControlAllowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(req),
    },
  });

const createChatForwardRepository = ({
  adminClient,
}: {
  adminClient: ReturnType<typeof createClient>;
}): ChatForwardRepository => ({
  async cleanupStoragePaths(storagePaths) {
    const normalizedStoragePaths = [...new Set(storagePaths)]
      .map(storagePath => storagePath.trim())
      .filter(Boolean);

    if (normalizedStoragePaths.length === 0) {
      return;
    }

    const { error } = await adminClient.storage
      .from(CHAT_BUCKET)
      .remove(normalizedStoragePaths);
    if (error) {
      throw new Error(error.message);
    }
  },
  async copyStorageObject(sourcePath, destinationPath) {
    const { error } = await adminClient.storage
      .from(CHAT_BUCKET)
      .copy(sourcePath, destinationPath);

    return {
      error: error?.message ?? null,
    };
  },
  async deleteMessageById(messageId) {
    const { error } = await adminClient
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      throw new Error(error.message);
    }
  },
  async getAccessibleMessage(messageId, userId) {
    const { data, error } = await adminClient
      .from('chat_messages')
      .select(
        'id, sender_id, receiver_id, message, message_type, file_name, file_kind, file_mime_type, file_size, file_storage_path, file_preview_url, file_preview_page_count, file_preview_status, file_preview_error'
      )
      .eq('id', messageId)
      .in('message_type', ['text', 'image', 'file'])
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .maybeSingle();

    return {
      message: data,
      error: error?.message ?? null,
    };
  },
  async getAttachmentCaption(messageId, userId) {
    const { data, error } = await adminClient
      .from('chat_messages')
      .select('id, message')
      .eq('reply_to_id', messageId)
      .eq('message_relation_kind', 'attachment_caption')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .maybeSingle();

    return {
      caption: data,
      error: error?.message ?? null,
    };
  },
  async insertMessage(payload) {
    const { data, error } = await adminClient
      .from('chat_messages')
      .insert(payload)
      .select('id')
      .single();

    return {
      message: data,
      error: error?.message ?? null,
    };
  },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: buildCorsHeaders(req),
    });
  }

  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorizationHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, 500, { error: 'Missing Supabase environment variables' });
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return json(req, 401, { error: 'Missing auth token' });
  }

  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, '');
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user?.id) {
    return json(req, 401, { error: 'Unauthorized' });
  }

  let payload: ChatForwardMessageRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: 'Invalid JSON body' });
  }

  const result = await forwardChatMessage({
    repository: createChatForwardRepository({
      adminClient,
    }),
    userId: user.id,
    messageId: payload.messageId,
    recipientIds: payload.recipientIds,
  });

  return json(req, result.status, result.body);
});
