import type { ChatRemoteAssetRequestPayload } from "../../../shared/chatFunctionContracts.ts";

const SUPPORTED_URL_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1"]);
const GOOGLE_DRIVE_TITLE_SUFFIX_PATTERN = /\s*-\s*Google Drive\s*$/i;

const normalizeHostname = (hostname: string) =>
  hostname.replace(/^\[|\]$/g, "").trim().toLowerCase();

const isPrivateIpv4Hostname = (hostname: string) => {
  const octets = hostname.split(".").map(segment => Number(segment));
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet))) {
    return false;
  }

  const [firstOctet, secondOctet] = octets;

  if (firstOctet === 10 || firstOctet === 127) {
    return true;
  }

  if (firstOctet === 169 && secondOctet === 254) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  return firstOctet === 192 && secondOctet === 168;
};

const isPrivateIpv6Hostname = (hostname: string) => {
  const normalizedHostname = normalizeHostname(hostname);

  return (
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe8") ||
    normalizedHostname.startsWith("fe9") ||
    normalizedHostname.startsWith("fea") ||
    normalizedHostname.startsWith("feb")
  );
};

const isBlockedHostname = (hostname: string) => {
  const normalizedHostname = normalizeHostname(hostname);

  return (
    BLOCKED_HOSTNAMES.has(normalizedHostname) ||
    normalizedHostname.endsWith(".local") ||
    isPrivateIpv4Hostname(normalizedHostname) ||
    isPrivateIpv6Hostname(normalizedHostname)
  );
};

export const resolveChatRemoteAssetUrl = (
  payload: ChatRemoteAssetRequestPayload
) => {
  const rawUrl = payload.url?.trim();
  if (!rawUrl) {
    return {
      error: "url is required",
      status: 400,
      url: null,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      error: "Invalid remote asset URL",
      status: 400,
      url: null,
    };
  }

  if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      error: "Only HTTP and HTTPS URLs are supported",
      status: 400,
      url: null,
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      error: "Remote asset URL credentials are not allowed",
      status: 400,
      url: null,
    };
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return {
      error: "Forbidden",
      status: 403,
      url: null,
    };
  }

  return {
    error: null,
    status: 200,
    url: parsedUrl.toString(),
  };
};

export const isHtmlLikeRemoteAssetMimeType = (mimeType?: string | null) => {
  const normalizedMimeType = mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";

  return (
    normalizedMimeType.startsWith("text/html") ||
    normalizedMimeType.startsWith("application/xhtml+xml")
  );
};

const normalizeRemoteHtmlTitle = (value: string) =>
  value.replace(GOOGLE_DRIVE_TITLE_SUFFIX_PATTERN, "").trim();

export const extractRemoteHtmlTitle = (html: string) => {
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (ogTitleMatch?.[1]) {
    const normalizedTitle = normalizeRemoteHtmlTitle(ogTitleMatch[1]);
    return normalizedTitle || null;
  }

  const itemPropNameMatch = html.match(
    /<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  if (itemPropNameMatch?.[1]) {
    const normalizedTitle = normalizeRemoteHtmlTitle(itemPropNameMatch[1]);
    return normalizedTitle || null;
  }

  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch?.[1]) {
    return null;
  }

  const normalizedTitle = normalizeRemoteHtmlTitle(titleMatch[1]);
  return normalizedTitle || null;
};
