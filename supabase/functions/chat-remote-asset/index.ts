import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { ChatRemoteAssetRequestPayload } from "../../../shared/chatFunctionContracts.ts";
import {
  buildChatRemoteAssetRequestHeaders,
  extractRemoteHtmlTitle,
  isHtmlLikeRemoteAssetMimeType,
  resolveChatRemoteAssetUrl,
} from "./actions.ts";

const buildCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get("Origin");
  const accessControlAllowOrigin =
    requestOrigin && requestOrigin.length > 0 ? requestOrigin : "*";

  return {
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Expose-Headers":
      "Content-Disposition, X-Chat-Remote-Content-Type, X-Chat-Remote-Source-Url, X-Chat-Remote-File-Name",
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
  const authorizationHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey) {
    return json(req, 500, { error: "Missing Supabase environment variables" });
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return json(req, 401, { error: "Missing auth token" });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user?.id) {
    return json(req, 401, { error: "Unauthorized" });
  }

  let payload: ChatRemoteAssetRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  const resolvedAssetRequest = resolveChatRemoteAssetUrl(payload);
  if (!resolvedAssetRequest.url) {
    return json(req, resolvedAssetRequest.status, {
      error: resolvedAssetRequest.error ?? "Invalid remote asset URL",
    });
  }

  const resolvedFileNameSourceRequest = payload.fileNameSourceUrl?.trim()
    ? resolveChatRemoteAssetUrl({
        url: payload.fileNameSourceUrl,
      })
    : null;
  if (resolvedFileNameSourceRequest && !resolvedFileNameSourceRequest.url) {
    return json(req, resolvedFileNameSourceRequest.status, {
      error:
        resolvedFileNameSourceRequest.error ?? "Invalid remote asset title URL",
    });
  }

  let remoteResponse: Response;
  try {
    remoteResponse = await fetch(resolvedAssetRequest.url, {
      headers: buildChatRemoteAssetRequestHeaders(
        "image/*,application/pdf,application/octet-stream;q=0.9,*/*;q=0.1"
      ),
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Failed to fetch remote chat asset", error);
    return json(req, 502, { error: "Failed to fetch remote asset" });
  }

  if (!remoteResponse.ok) {
    return json(req, 502, {
      error: `Remote server responded with status ${remoteResponse.status}`,
    });
  }

  const remoteContentType = remoteResponse.headers.get("content-type");
  if (isHtmlLikeRemoteAssetMimeType(remoteContentType)) {
    return json(req, 415, {
      error: "Link harus mengarah ke gambar atau PDF yang valid",
    });
  }

  if (!remoteResponse.body) {
    return json(req, 502, { error: "Remote asset body is empty" });
  }

  const contentDisposition = remoteResponse.headers.get("content-disposition");
  let fileNameHint: string | null = null;

  if (
    !contentDisposition &&
    resolvedFileNameSourceRequest?.url &&
    resolvedFileNameSourceRequest.url !== resolvedAssetRequest.url
  ) {
    try {
      const titleResponse = await fetch(resolvedFileNameSourceRequest.url, {
        headers: buildChatRemoteAssetRequestHeaders(
          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"
        ),
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });

      if (titleResponse.ok) {
        const titleResponseType = titleResponse.headers.get("content-type");
        if (isHtmlLikeRemoteAssetMimeType(titleResponseType)) {
          fileNameHint = extractRemoteHtmlTitle(await titleResponse.text());
        }
      }
    } catch (error) {
      console.warn("Failed to resolve remote asset title", error);
    }
  }

  return new Response(remoteResponse.body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/octet-stream",
      ...(contentDisposition
        ? { "Content-Disposition": contentDisposition }
        : {}),
      ...(fileNameHint ? { "X-Chat-Remote-File-Name": fileNameHint } : {}),
      "X-Chat-Remote-Content-Type": remoteContentType ?? "",
      "X-Chat-Remote-Source-Url":
        remoteResponse.url || resolvedAssetRequest.url,
      ...buildCorsHeaders(req),
    },
  });
});
