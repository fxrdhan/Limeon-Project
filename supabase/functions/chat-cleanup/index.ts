import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cleanupStoragePaths,
  deleteThreadAndCleanup,
  deleteThreadsAndCleanup,
  normalizeStoragePaths,
  partitionOwnedChatPaths,
  retryCleanupFailures,
  type CleanupAction,
  type ChatCleanupRepository,
} from "./actions.ts";

const CHAT_BUCKET = "chat";
const STORAGE_DELETE_MAX_ATTEMPTS = 3;
const STORAGE_DELETE_RETRY_DELAY_MS = 180;

interface ChatCleanupRequest {
  action?: CleanupAction;
  messageId?: string;
  messageIds?: string[];
  storagePaths?: string[];
}

const buildCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get("Origin");
  const accessControlAllowOrigin =
    requestOrigin && requestOrigin.length > 0 ? requestOrigin : "*";

  return {
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const wait = (durationMs: number) =>
  new Promise(resolve => {
    setTimeout(resolve, durationMs);
  });

const deleteStoragePathsWithRetry = async (
  adminClient: ReturnType<typeof createClient>,
  storagePaths: string[]
) => {
  let pendingPaths = normalizeStoragePaths(storagePaths);

  for (
    let attemptIndex = 0;
    attemptIndex < STORAGE_DELETE_MAX_ATTEMPTS && pendingPaths.length > 0;
    attemptIndex += 1
  ) {
    const currentAttemptPaths = [...pendingPaths];
    const results = await Promise.allSettled(
      currentAttemptPaths.map(async storagePath => {
        const { error } = await adminClient.storage
          .from(CHAT_BUCKET)
          .remove([storagePath]);

        if (error) {
          throw error;
        }
      })
    );

    pendingPaths = results.flatMap((result, resultIndex) =>
      result.status === "rejected" ? [currentAttemptPaths[resultIndex]] : []
    );

    if (
      pendingPaths.length > 0 &&
      attemptIndex < STORAGE_DELETE_MAX_ATTEMPTS - 1
    ) {
      await wait(STORAGE_DELETE_RETRY_DELAY_MS * (attemptIndex + 1));
    }
  }

  return pendingPaths;
};

const recordStoredCleanupFailure = async ({
  adminClient,
  requestedBy,
  messageId,
  failureStage,
  storagePaths,
  lastError,
}: {
  adminClient: ReturnType<typeof createClient>;
  requestedBy: string;
  messageId?: string | null;
  failureStage: "delete_thread" | "cleanup_storage";
  storagePaths: string[];
  lastError: string;
}) => {
  const normalizedStoragePaths = normalizeStoragePaths(storagePaths);
  if (normalizedStoragePaths.length === 0) {
    return;
  }

  const { error } = await adminClient
    .from("chat_storage_cleanup_failures")
    .insert({
      requested_by: requestedBy,
      message_id: messageId ?? null,
      failure_stage: failureStage,
      storage_paths: normalizedStoragePaths,
      attempts: 1,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to record chat cleanup failure", error);
  }
};

const resolveStoredCleanupFailure = async (
  adminClient: ReturnType<typeof createClient>,
  failureId: string
) => {
  const { error } = await adminClient
    .from("chat_storage_cleanup_failures")
    .update({
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", failureId);

  if (error) {
    console.error("Failed to resolve chat cleanup failure", error);
  }
};

const updateStoredCleanupFailureAttempt = async (
  adminClient: ReturnType<typeof createClient>,
  failureId: string,
  attempts: number,
  lastError: string,
  storagePaths?: string[]
) => {
  const normalizedStoragePaths = storagePaths
    ? normalizeStoragePaths(storagePaths)
    : null;
  const { error } = await adminClient
    .from("chat_storage_cleanup_failures")
    .update({
      attempts,
      last_error: lastError,
      storage_paths: normalizedStoragePaths ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", failureId);

  if (error) {
    console.error("Failed to update chat cleanup failure", error);
  }
};

const createChatCleanupRepository = ({
  adminClient,
  userClient,
}: {
  adminClient: ReturnType<typeof createClient>;
  userClient: ReturnType<typeof createClient>;
}): ChatCleanupRepository => ({
  async getOwnedParentMessage(messageId, userId) {
    const { data, error } = await userClient
      .from("chat_messages")
      .select(
        "id, sender_id, message, message_type, file_name, file_mime_type, file_preview_url, file_storage_path"
      )
      .eq("id", messageId)
      .eq("sender_id", userId)
      .maybeSingle();

    return {
      message: data,
      error: error?.message ?? null,
    };
  },
  async deleteMessageThread(messageId) {
    const { data, error } = await userClient.rpc("delete_chat_message_thread", {
      p_message_id: messageId,
    });

    return {
      deletedMessageIds: Array.isArray(data) ? data : [],
      error: error?.message ?? null,
    };
  },
  async deleteStoragePaths(storagePaths) {
    return deleteStoragePathsWithRetry(adminClient, storagePaths);
  },
  async recordCleanupFailure(params) {
    await recordStoredCleanupFailure({
      adminClient,
      ...params,
    });
  },
  async listPendingCleanupFailures(userId, limit) {
    const { data, error } = await adminClient
      .from("chat_storage_cleanup_failures")
      .select("id, storage_paths, attempts")
      .eq("requested_by", userId)
      .is("resolved_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    return {
      failures: data ?? [],
      error: error?.message ?? null,
    };
  },
  async resolveCleanupFailure(failureId) {
    await resolveStoredCleanupFailure(adminClient, failureId);
  },
  async updateCleanupFailureAttempt(
    failureId,
    attempts,
    lastError,
    storagePaths
  ) {
    await updateStoredCleanupFailureAttempt(
      adminClient,
      failureId,
      attempts,
      lastError,
      storagePaths
    );
  },
});

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: buildCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorizationHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 500, { error: "Missing Supabase environment variables" });
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return json(req, 401, { error: "Missing auth token" });
  }

  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, "");
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
    return json(req, 401, { error: "Unauthorized" });
  }

  let payload: ChatCleanupRequest;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }
  const repository = createChatCleanupRepository({
    adminClient,
    userClient,
  });

  if (payload.action === "delete_thread") {
    const result = await deleteThreadAndCleanup({
      repository,
      userId: user.id,
      messageId: payload.messageId,
    });

    return json(req, result.status, result.body);
  }

  if (payload.action === "delete_threads") {
    const result = await deleteThreadsAndCleanup({
      repository,
      userId: user.id,
      messageIds: payload.messageIds,
    });

    return json(req, result.status, result.body);
  }

  if (payload.action === "cleanup_storage") {
    const result = await cleanupStoragePaths({
      repository,
      userId: user.id,
      storagePaths: payload.storagePaths,
    });

    return json(req, result.status, result.body);
  }

  if (payload.action === "retry_failures") {
    const result = await retryCleanupFailures({
      repository,
      userId: user.id,
    });

    return json(req, result.status, result.body);
  }

  return json(req, 400, { error: "Unsupported action" });
});
