import { chatSidebarShareGateway } from '../../data/chatSidebarGateway';
import { normalizeUrlPathSegments } from './urlParsing';

const GOOGLE_DRIVE_HOSTNAMES = new Set(['drive.google.com']);
const CHAT_SHARED_LINK_SLUG_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;

export const extractGoogleDriveFileId = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const normalizedHostname = parsedUrl.hostname.toLowerCase();
    if (!GOOGLE_DRIVE_HOSTNAMES.has(normalizedHostname)) {
      return null;
    }

    const pathFileIdMatch = parsedUrl.pathname.match(/^\/file\/d\/([^/]+)/i);
    if (pathFileIdMatch?.[1]) {
      return pathFileIdMatch[1];
    }

    const searchFileId = parsedUrl.searchParams.get('id');
    if (
      searchFileId &&
      (parsedUrl.pathname === '/open' || parsedUrl.pathname === '/uc')
    ) {
      return searchFileId;
    }

    return null;
  } catch {
    return null;
  }
};

export const isChatSharedLinkUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const pathSegments = normalizeUrlPathSegments(parsedUrl.pathname);
    const slug = pathSegments[pathSegments.length - 1]?.toLowerCase() || '';
    if (!CHAT_SHARED_LINK_SLUG_PATTERN.test(slug)) {
      return false;
    }

    const patterns = getChatSharedLinkPatterns();
    return patterns.some(
      ({ hostname, pathPrefixSegments }) =>
        hostname === parsedUrl.hostname.toLowerCase() &&
        pathSegments.length === pathPrefixSegments.length + 1 &&
        pathPrefixSegments.every(
          (segment, index) => segment === pathSegments[index]
        )
    );
  } catch {
    return false;
  }
};

export const isKnownAttachmentRemoteAssetUrl = (url: string) =>
  extractGoogleDriveFileId(url) !== null || isChatSharedLinkUrl(url);

export const normalizeAttachmentRemoteAssetUrl = (url: string) => {
  const googleDriveFileId = extractGoogleDriveFileId(url);
  if (!googleDriveFileId) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    const normalizedUrl = new URL('https://drive.google.com/uc');
    normalizedUrl.searchParams.set('export', 'download');
    normalizedUrl.searchParams.set('id', googleDriveFileId);

    const resourceKey = parsedUrl.searchParams.get('resourcekey');
    if (resourceKey) {
      normalizedUrl.searchParams.set('resourcekey', resourceKey);
    }

    return normalizedUrl.toString();
  } catch {
    return url;
  }
};

const buildChatSharedLinkPattern = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const pathSegments = normalizeUrlPathSegments(parsedUrl.pathname);
    const slug = pathSegments[pathSegments.length - 1]?.toLowerCase() || '';
    if (!CHAT_SHARED_LINK_SLUG_PATTERN.test(slug)) {
      return null;
    }

    return {
      hostname: parsedUrl.hostname.toLowerCase(),
      pathPrefixSegments: pathSegments.slice(0, -1),
    };
  } catch {
    return null;
  }
};

const getChatSharedLinkPatterns = () => {
  const patterns = new Map<
    string,
    {
      hostname: string;
      pathPrefixSegments: string[];
    }
  >();

  for (const pattern of [
    buildChatSharedLinkPattern('https://shrtlink.works/23456789ab'),
    buildChatSharedLinkPattern(
      chatSidebarShareGateway.buildShortUrl('23456789ab')
    ),
  ]) {
    if (!pattern) {
      continue;
    }

    patterns.set(
      `${pattern.hostname}/${pattern.pathPrefixSegments.join('/')}`,
      pattern
    );
  }

  return [...patterns.values()];
};
