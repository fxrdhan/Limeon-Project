import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { ChatSharedLinkCreateRequestPayload } from "../../../shared/chatFunctionContracts.ts";
import {
  createChatSharedLink,
  redirectChatSharedLink,
  type ChatLinkRepository,
} from "./actions.ts";

const CHAT_BUCKET = "chat";

const buildCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get("Origin");
  const accessControlAllowOrigin = requestOrigin && requestOrigin.length > 0 ? requestOrigin : "*";

  return {
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(req),
    },
  });

const createChatLinkRepository = ({
  adminClient,
  attachmentClient = adminClient,
}: {
  adminClient: ReturnType<typeof createClient>;
  attachmentClient?: ReturnType<typeof createClient>;
}): ChatLinkRepository => ({
  async getAccessibleAttachmentByMessageId(messageId) {
    const { data, error } = await attachmentClient
      .from("chat_messages")
      .select("id, sender_id, receiver_id, message_type, file_storage_path, shared_link_slug")
      .eq("id", messageId)
      .in("message_type", ["image", "file"])
      .limit(1)
      .maybeSingle();

    return {
      attachment: data,
      error: error?.message ?? null,
    };
  },
  async getAccessibleAttachmentByStoragePath(storagePath) {
    const { data, error } = await attachmentClient
      .from("chat_messages")
      .select("id, sender_id, receiver_id, message_type, file_storage_path, shared_link_slug")
      .eq("file_storage_path", storagePath)
      .in("message_type", ["image", "file"])
      .limit(1)
      .maybeSingle();

    return {
      attachment: data,
      error: error?.message ?? null,
    };
  },
  async getActiveSharedLinkByMessageId(messageId) {
    const now = new Date().toISOString();
    const { data, error } = await adminClient
      .from("chat_shared_links")
      .select("id, slug, storage_path, message_id, revoked_at, expires_at")
      .eq("message_id", messageId)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    return {
      link: data,
      error: error?.message ?? null,
    };
  },
  async getActiveSharedLinkByStoragePath(storagePath) {
    const now = new Date().toISOString();
    const { data, error } = await adminClient
      .from("chat_shared_links")
      .select("id, slug, storage_path, message_id, revoked_at, expires_at")
      .eq("storage_path", storagePath)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    return {
      link: data,
      error: error?.message ?? null,
    };
  },
  async getActiveSharedLinkBySlug(slug) {
    const now = new Date().toISOString();
    const { data, error } = await adminClient
      .from("chat_shared_links")
      .select("id, slug, storage_path, message_id, revoked_at, expires_at")
      .eq("slug", slug)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    return {
      link: data,
      error: error?.message ?? null,
    };
  },
  async createSharedLink({ slug, storagePath, messageId, userId }) {
    const { data, error } = await adminClient
      .from("chat_shared_links")
      .insert({
        slug,
        storage_path: storagePath ?? null,
        message_id: messageId ?? null,
        created_by: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, slug, storage_path, message_id, revoked_at, expires_at")
      .single();

    return {
      link: data,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    };
  },
  async assignSharedLinkToMessage(linkId, messageId) {
    const timestamp = new Date().toISOString();
    const { error } = await adminClient
      .from("chat_shared_links")
      .update({
        message_id: messageId,
        updated_at: timestamp,
      })
      .eq("id", linkId)
      .is("message_id", null);

    return {
      error: error?.message ?? null,
    };
  },
  async syncAttachmentSharedLinkSlug(messageId, slug) {
    const { error } = await adminClient
      .from("chat_messages")
      .update({
        shared_link_slug: slug,
      })
      .eq("id", messageId)
      .or(`shared_link_slug.is.null,shared_link_slug.neq.${slug}`);

    return {
      error: error?.message ?? null,
    };
  },
  async touchSharedLinkAccess(linkId) {
    const timestamp = new Date().toISOString();

    const { error } = await adminClient
      .from("chat_shared_links")
      .update({
        last_accessed_at: timestamp,
        updated_at: timestamp,
      })
      .eq("id", linkId);

    if (error) {
      console.error("Failed to update chat shared link access", error);
    }
  },
  async createSignedAssetUrl(storagePath, expiresInSeconds) {
    const { data, error } = await adminClient.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    return {
      signedUrl: data?.signedUrl ?? null,
      error: error?.message ?? null,
    };
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: buildCorsHeaders(req),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, 500, { error: "Missing Supabase environment variables" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === "GET") {
    const repository = createChatLinkRepository({
      adminClient,
    });
    const result = await redirectChatSharedLink({
      repository,
      requestUrl: req.url,
    });

    if ("redirectUrl" in result) {
      return Response.redirect(result.redirectUrl, result.status);
    }

    return json(req, result.status, result.body);
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorizationHeader = req.headers.get("Authorization");
  if (!anonKey) {
    return json(req, 500, { error: "Missing Supabase environment variables" });
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return json(req, 401, { error: "Missing auth token" });
  }

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
  } = await userClient.auth.getUser();
  if (authError || !user?.id) {
    return json(req, 401, { error: "Unauthorized" });
  }

  let payload: ChatSharedLinkCreateRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  const repository = createChatLinkRepository({
    adminClient,
    attachmentClient: userClient,
  });
  const result = await createChatSharedLink({
    repository,
    requestUrl: req.url,
    userId: user.id,
    messageId: payload.messageId,
    storagePath: payload.storagePath,
  });

  return json(req, result.status, result.body);
});
