import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { ChatRemoteAssetRequestPayload } from "../../../shared/chatFunctionContracts.ts";
import {
  CHAT_REMOTE_ASSET_FETCH_TIMEOUT_MS,
  CHAT_REMOTE_ASSET_MAX_REDIRECTS,
  buildChatRemoteAssetRequestHeaders,
  extractRemoteHtmlTitle,
  isChatRemoteAssetRedirectStatus,
  isHtmlLikeRemoteAssetMimeType,
  validateResolvedChatRemoteAssetUrl,
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

const fetchValidatedRemoteAssetResponse = async ({
  url,
  accept,
  failureMessage,
}: {
  url: string;
  accept: string;
  failureMessage: string;
}) => {
  let currentUrl = url;

  for (
    let redirectCount = 0;
    redirectCount <= CHAT_REMOTE_ASSET_MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const validatedRequest = await validateResolvedChatRemoteAssetUrl(currentUrl);
    if (!validatedRequest.url) {
      return {
        error: validatedRequest.error ?? failureMessage,
        response: null,
        sourceUrl: null,
        status: validatedRequest.status,
      };
    }

    let remoteResponse: Response;
    try {
      remoteResponse = await fetch(validatedRequest.url, {
        headers: buildChatRemoteAssetRequestHeaders(accept),
        redirect: "manual",
        signal: AbortSignal.timeout(CHAT_REMOTE_ASSET_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("Failed to fetch remote chat asset", error);
      return {
        error: failureMessage,
        response: null,
        sourceUrl: null,
        status: 502,
      };
    }

    if (!isChatRemoteAssetRedirectStatus(remoteResponse.status)) {
      return {
        error: null,
        response: remoteResponse,
        sourceUrl: validatedRequest.url,
        status: 200,
      };
    }

    const location = remoteResponse.headers.get("location");
    if (!location) {
      return {
        error: "Remote server returned an invalid redirect",
        response: null,
        sourceUrl: null,
        status: 502,
      };
    }

    try {
      currentUrl = new URL(location, validatedRequest.url).toString();
    } catch {
      return {
        error: "Remote server returned an invalid redirect",
        response: null,
        sourceUrl: null,
        status: 502,
      };
    }
  }

  return {
    error: "Remote server redirected too many times",
    response: null,
    sourceUrl: null,
    status: 502,
  };
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

  const remoteAssetResponse = await fetchValidatedRemoteAssetResponse({
    url: resolvedAssetRequest.url,
    accept:
      "image/*,application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
    failureMessage: "Failed to fetch remote asset",
  });
  if (!remoteAssetResponse.response) {
    return json(req, remoteAssetResponse.status, {
      error: remoteAssetResponse.error ?? "Failed to fetch remote asset",
    });
  }
  const remoteResponse = remoteAssetResponse.response;

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
      const titleResponseResult = await fetchValidatedRemoteAssetResponse({
        url: resolvedFileNameSourceRequest.url,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        failureMessage: "Failed to fetch remote asset title",
      });
      const titleResponse = titleResponseResult.response;

      if (titleResponse?.ok) {
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
        remoteAssetResponse.sourceUrl ?? resolvedAssetRequest.url,
      ...buildCorsHeaders(req),
    },
  });
});
