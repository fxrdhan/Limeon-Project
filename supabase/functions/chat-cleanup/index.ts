import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type ChatCleanupMessageRecord,
  isOwnedChatPath,
  resolveChatMessageStoragePaths,
} from "../../../shared/chatStoragePaths.ts";

const CHAT_BUCKET = "chat";
const STORAGE_DELETE_MAX_ATTEMPTS = 3;
const STORAGE_DELETE_RETRY_DELAY_MS = 180;

type CleanupAction = "delete_thread" | "cleanup_storage" | "retry_failures";

interface ChatCleanupRequest {
  action?: CleanupAction;
  messageId?: string;
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

const normalizeStoragePaths = (storagePaths: Array<string | null | undefined>) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

const partitionOwnedChatPaths = (storagePaths: string[], userId: string) => {
  const ownedStoragePaths: string[] = [];
  const foreignStoragePaths: string[] = [];

  normalizeStoragePaths(storagePaths).forEach(storagePath => {
    if (isOwnedChatPath(storagePath, userId)) {
      ownedStoragePaths.push(storagePath);
      return;
    }

    foreignStoragePaths.push(storagePath);
  });

  return {
    ownedStoragePaths,
    foreignStoragePaths,
  };
};

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

const recordCleanupFailure = async ({
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

const resolveCleanupFailure = async (
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

const updateCleanupFailureAttempt = async (
  adminClient: ReturnType<typeof createClient>,
  failureId: string,
  attempts: number,
  lastError: string
) => {
  const { error } = await adminClient
    .from("chat_storage_cleanup_failures")
    .update({
      attempts,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", failureId);

  if (error) {
    console.error("Failed to update chat cleanup failure", error);
  }
};

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

  if (payload.action === "delete_thread") {
    const messageId = payload.messageId?.trim();
    if (!messageId) {
      return json(req, 400, { error: "messageId is required" });
    }

    const { data: parentMessage, error: parentMessageError } = await userClient
      .from("chat_messages")
      .select(
        "id, sender_id, message, message_type, file_name, file_mime_type, file_preview_url, file_storage_path"
      )
      .eq("id", messageId)
      .eq("sender_id", user.id)
      .maybeSingle();

    if (parentMessageError) {
      return json(req, 500, { error: parentMessageError.message });
    }

    if (!parentMessage || parentMessage.sender_id !== user.id) {
      return json(req, 403, { error: "Forbidden" });
    }

    const storagePaths = resolveChatMessageStoragePaths(
      parentMessage as ChatCleanupMessageRecord
    );
    const { ownedStoragePaths, foreignStoragePaths } = partitionOwnedChatPaths(
      storagePaths,
      user.id
    );

    const { data: deletedMessageIds, error: deleteError } = await userClient.rpc(
      "delete_chat_message_thread",
      {
        p_message_id: messageId,
      }
    );

    if (deleteError) {
      return json(req, 500, { error: deleteError.message });
    }

    const normalizedDeletedMessageIds = (deletedMessageIds || []).filter(
      (deletedMessageId): deletedMessageId is string =>
        typeof deletedMessageId === "string" && deletedMessageId.length > 0
    );

    const deletedOwnedStoragePaths =
      ownedStoragePaths.length > 0
        ? await deleteStoragePathsWithRetry(adminClient, ownedStoragePaths)
        : [];
    const failedStoragePaths = normalizeStoragePaths([
      ...foreignStoragePaths,
      ...deletedOwnedStoragePaths,
    ]);

    if (failedStoragePaths.length > 0) {
      await recordCleanupFailure({
        adminClient,
        requestedBy: user.id,
        messageId,
        failureStage: "delete_thread",
        storagePaths: failedStoragePaths,
        lastError:
          foreignStoragePaths.length > 0
            ? "Skipped chat storage cleanup for path(s) that do not belong to the sender"
            : "Failed to fully clean up chat storage after deleting a thread",
      });
    }

    return json(req, 200, {
      deletedMessageIds: normalizedDeletedMessageIds,
      failedStoragePaths,
    });
  }

  if (payload.action === "cleanup_storage") {
    const storagePaths = normalizeStoragePaths(payload.storagePaths ?? []);
    if (storagePaths.length === 0) {
      return json(req, 200, { failedStoragePaths: [] });
    }

    const hasForeignPath = storagePaths.some(
      storagePath => !isOwnedChatPath(storagePath, user.id)
    );
    if (hasForeignPath) {
      return json(req, 403, { error: "Forbidden" });
    }

    const failedStoragePaths = await deleteStoragePathsWithRetry(
      adminClient,
      storagePaths
    );

    if (failedStoragePaths.length > 0) {
      await recordCleanupFailure({
        adminClient,
        requestedBy: user.id,
        messageId: null,
        failureStage: "cleanup_storage",
        storagePaths: failedStoragePaths,
        lastError: "Failed to fully clean up chat storage",
      });
    }

    return json(req, 200, {
      failedStoragePaths,
    });
  }

  if (payload.action === "retry_failures") {
    const { data: failures, error: failuresError } = await adminClient
      .from("chat_storage_cleanup_failures")
      .select("id, storage_paths, attempts")
      .eq("requested_by", user.id)
      .is("resolved_at", null)
      .order("created_at", { ascending: true })
      .limit(20);

    if (failuresError) {
      return json(req, 500, { error: failuresError.message });
    }

    let resolvedCount = 0;
    let remainingCount = failures?.length ?? 0;

    for (const failure of failures || []) {
      const { ownedStoragePaths, foreignStoragePaths } = partitionOwnedChatPaths(
        failure.storage_paths ?? [],
        user.id
      );
      const retriedOwnedStoragePaths =
        ownedStoragePaths.length > 0
          ? await deleteStoragePathsWithRetry(adminClient, ownedStoragePaths)
          : [];
      const failedStoragePaths = normalizeStoragePaths([
        ...foreignStoragePaths,
        ...retriedOwnedStoragePaths,
      ]);

      if (failedStoragePaths.length === 0) {
        resolvedCount += 1;
        remainingCount -= 1;
        await resolveCleanupFailure(adminClient, failure.id);
        continue;
      }

      await updateCleanupFailureAttempt(
        adminClient,
        failure.id,
        (failure.attempts ?? 0) + 1,
        foreignStoragePaths.length > 0
          ? "Skipped chat storage cleanup for path(s) that do not belong to the sender"
          : "Failed to fully clean up chat storage during retry"
      );
    }

    return json(req, 200, {
      resolvedCount,
      remainingCount,
    });
  }

  return json(req, 400, { error: "Unsupported action" });
});
