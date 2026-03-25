import { isIP } from "node:net";
import type { ChatRemoteAssetRequestPayload } from "../../../shared/chatFunctionContracts.ts";

const SUPPORTED_URL_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1"]);
const GOOGLE_DRIVE_TITLE_SUFFIX_PATTERN = /\s*-\s*Google Drive\s*$/i;
const REMOTE_ASSET_BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
export const CHAT_REMOTE_ASSET_MAX_REDIRECTS = 5;
export const CHAT_REMOTE_ASSET_FETCH_TIMEOUT_MS = 15_000;

const normalizeHostname = (hostname: string) =>
  hostname.replace(/^\[|\]$/g, "").trim().toLowerCase();

const normalizeIpAddress = (value: string) =>
  normalizeHostname(value).split("%")[0] ?? "";

const parseIpv4Octets = (hostname: string) => {
  const octets = hostname.split(".").map(segment => Number(segment));
  if (
    octets.length !== 4 ||
    octets.some(
      octet =>
        !Number.isInteger(octet) || octet < 0 || octet > 255
    )
  ) {
    return null;
  }

  return octets;
};

const isBlockedIpv4Address = (hostname: string) => {
  const octets = parseIpv4Octets(hostname);
  if (!octets) {
    return false;
  }

  const [firstOctet, secondOctet, thirdOctet] = octets;

  if (firstOctet === 0 || firstOctet === 10 || firstOctet === 127) {
    return true;
  }

  if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) {
    return true;
  }

  if (firstOctet === 169 && secondOctet === 254) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  if (firstOctet === 192 && secondOctet === 168) {
    return true;
  }

  if (firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) {
    return true;
  }

  if (firstOctet === 192 && secondOctet === 0 && thirdOctet === 2) {
    return true;
  }

  if (firstOctet === 198 && secondOctet === 51 && thirdOctet === 100) {
    return true;
  }

  if (firstOctet === 203 && secondOctet === 0 && thirdOctet === 113) {
    return true;
  }

  return firstOctet >= 224;
};

const extractMappedIpv4FromIpv6 = (hostname: string) => {
  const normalizedHostname = normalizeIpAddress(hostname);
  const dottedMatch = normalizedHostname.match(
    /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i
  );
  if (dottedMatch?.[1]) {
    return dottedMatch[1];
  }

  const hexMatch = normalizedHostname.match(
    /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i
  );
  if (!hexMatch?.[1] || !hexMatch[2]) {
    return null;
  }

  const upperBytes = Number.parseInt(hexMatch[1], 16);
  const lowerBytes = Number.parseInt(hexMatch[2], 16);
  if (!Number.isFinite(upperBytes) || !Number.isFinite(lowerBytes)) {
    return null;
  }

  return [
    upperBytes >> 8,
    upperBytes & 0xff,
    lowerBytes >> 8,
    lowerBytes & 0xff,
  ].join(".");
};

const isBlockedIpv6Address = (hostname: string) => {
  const normalizedHostname = normalizeIpAddress(hostname);
  const mappedIpv4Address = extractMappedIpv4FromIpv6(normalizedHostname);
  if (mappedIpv4Address) {
    return isBlockedIpv4Address(mappedIpv4Address);
  }

  return (
    normalizedHostname === "::" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe8") ||
    normalizedHostname.startsWith("fe9") ||
    normalizedHostname.startsWith("fea") ||
    normalizedHostname.startsWith("feb") ||
    normalizedHostname.startsWith("ff")
  );
};

const isBlockedHostname = (hostname: string) => {
  const normalizedHostname = normalizeHostname(hostname);
  const ipVersion = isIP(normalizedHostname);

  return (
    BLOCKED_HOSTNAMES.has(normalizedHostname) ||
    normalizedHostname.endsWith(".local") ||
    (ipVersion === 4 && isBlockedIpv4Address(normalizedHostname)) ||
    (ipVersion === 6 && isBlockedIpv6Address(normalizedHostname))
  );
};

type DnsResolver = (
  query: string,
  recordType: "A" | "AAAA"
) => Promise<string[]>;

const getDnsResolver = (): DnsResolver | null => {
  const maybeDeno = globalThis as typeof globalThis & {
    Deno?: {
      resolveDns?: DnsResolver;
    };
  };
  const resolveDns = maybeDeno.Deno?.resolveDns;

  return typeof resolveDns === "function" ? resolveDns.bind(maybeDeno.Deno) : null;
};

const resolveHostnameAddresses = async (hostname: string) => {
  const dnsResolver = getDnsResolver();
  if (!dnsResolver) {
    throw new Error("DNS resolution is unavailable");
  }

  const dnsResults = await Promise.allSettled([
    dnsResolver(hostname, "A"),
    dnsResolver(hostname, "AAAA"),
  ]);

  return [
    ...new Set(
      dnsResults.flatMap(result =>
        result.status === "fulfilled"
          ? result.value
              .map(address => normalizeIpAddress(address))
              .filter(Boolean)
          : []
      )
    ),
  ];
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

export const validateResolvedChatRemoteAssetUrl = async (url: string) => {
  const resolvedRequest = resolveChatRemoteAssetUrl({ url });
  if (!resolvedRequest.url) {
    return resolvedRequest;
  }

  const parsedUrl = new URL(resolvedRequest.url);

  if (isBlockedHostname(parsedUrl.hostname)) {
    return {
      error: "Forbidden",
      status: 403,
      url: null,
    };
  }

  const normalizedHostname = normalizeHostname(parsedUrl.hostname);
  if (isIP(normalizedHostname) !== 0) {
    return {
      error: null,
      status: 200,
      url: parsedUrl.toString(),
    };
  }

  let resolvedAddresses: string[];
  try {
    resolvedAddresses = await resolveHostnameAddresses(normalizedHostname);
  } catch (error) {
    console.error("Failed to resolve remote asset hostname", error);
    return {
      error: "Failed to resolve remote asset URL",
      status: 502,
      url: null,
    };
  }

  if (resolvedAddresses.length === 0) {
    return {
      error: "Failed to resolve remote asset URL",
      status: 502,
      url: null,
    };
  }

  if (resolvedAddresses.some(address => isBlockedHostname(address))) {
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

export const buildChatRemoteAssetRequestHeaders = (accept: string) => ({
  Accept: accept,
  "User-Agent": REMOTE_ASSET_BROWSER_LIKE_USER_AGENT,
});

export const isChatRemoteAssetRedirectStatus = (status: number) =>
  status === 301 ||
  status === 302 ||
  status === 303 ||
  status === 307 ||
  status === 308;

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
