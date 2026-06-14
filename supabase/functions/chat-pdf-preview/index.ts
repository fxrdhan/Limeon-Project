import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  persistPdfPreview,
  type ChatPdfPreviewRepository,
} from './actions.ts';

const CHAT_BUCKET = 'chat';

interface ChatPdfPreviewRequest {
  message_id?: string;
  preview_png_base64?: string;
  page_count?: number;
}

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

const decodeBase64Png = (value?: string | null) => {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return null;
  }

  const base64Payload = normalizedValue.replace(
    /^data:image\/png;base64,/i,
    ''
  );

  try {
    const binary = atob(base64Payload);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return null;
  }
};

const createChatPdfPreviewRepository = ({
  adminClient,
  userClient,
}: {
  adminClient: ReturnType<typeof createClient>;
  userClient: ReturnType<typeof createClient>;
}): ChatPdfPreviewRepository => ({
  async getOwnedPdfMessage(messageId, userId) {
    const { data, error } = await adminClient
      .from('chat_messages')
      .select(
        'id, sender_id, message, message_type, file_name, file_mime_type, file_storage_path, file_preview_url, file_preview_status, file_preview_page_count'
      )
      .eq('id', messageId)
      .eq('sender_id', userId)
      .maybeSingle();

    return {
      message: data,
      error: error?.message ?? null,
    };
  },
  async updatePreviewMetadata(messageId, payload) {
    const { data, error } = await userClient.rpc(
      'update_chat_file_preview_metadata',
      {
        p_message_id: messageId,
        p_file_preview_url: payload.file_preview_url ?? null,
        p_file_preview_page_count: payload.file_preview_page_count ?? null,
        p_file_preview_status: payload.file_preview_status ?? null,
        p_file_preview_error: payload.file_preview_error ?? null,
      }
    );

    return {
      message: data,
      error: error?.message ?? null,
    };
  },
  async uploadPreviewAsset(storagePath, previewBytes) {
    const { error } = await adminClient.storage.from(CHAT_BUCKET).upload(
      storagePath,
      new Blob([previewBytes], {
        type: 'image/png',
      }),
      {
        cacheControl: '3600',
        contentType: 'image/png',
        upsert: true,
      }
    );

    return {
      error: error?.message ?? null,
    };
  },
  async deletePreviewAsset(storagePath) {
    const { error } = await adminClient.storage
      .from(CHAT_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Failed to delete chat PDF preview asset', error);
    }
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorizationHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 500, { error: 'Missing Supabase environment variables' });
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return json(req, 401, { error: 'Missing auth token' });
  }

  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, '');
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user?.id) {
    return json(req, 401, { error: 'Unauthorized' });
  }

  let payload: ChatPdfPreviewRequest;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: 'Invalid JSON body' });
  }

  const previewBytes = decodeBase64Png(payload.preview_png_base64);
  const repository = createChatPdfPreviewRepository({
    adminClient,
    userClient,
  });
  const result = await persistPdfPreview({
    repository,
    userId: user.id,
    messageId: payload.message_id,
    previewBytes,
    pageCount: payload.page_count,
  });

  return json(req, result.status, result.body);
});
