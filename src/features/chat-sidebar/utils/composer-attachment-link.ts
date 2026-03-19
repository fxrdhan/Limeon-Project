import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from './message-file';
import { chatRemoteAssetService } from '@/services/api/chat/remote-asset.service';
import { findMessageLinks } from './message-search';

export interface AttachmentComposerLinkMatch {
  source: 'direct-url' | 'html-attachment' | 'markdown-attachment';
  url: string;
}

export interface AttachmentComposerRemoteFile {
  file: File;
  fileKind: 'image' | 'document';
  sourceUrl: string;
}

export interface ComposerClipboardLinkMatch {
  source: 'attachment' | 'generic';
  pastedText: string;
  url: string;
}

const SUPPORTED_URL_PROTOCOLS = new Set(['http:', 'https:']);
const GENERIC_BINARY_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
]);
const MARKDOWN_IMAGE_PATTERN =
  /^!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/i;
const MARKDOWN_LINK_PATTERN =
  /^\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/i;
const HTML_ATTACHMENT_PATTERNS = [
  /<(?:img|iframe|embed|source)\b[^>]*\bsrc=(['"])(.*?)\1/i,
  /<object\b[^>]*\bdata=(['"])(.*?)\1/i,
];
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};
const PDF_MIME_TYPE = 'application/pdf';
const GOOGLE_DRIVE_HOSTNAMES = new Set(['drive.google.com']);
const CHAT_SHARED_LINK_HOSTNAMES = new Set(['shrtlink.works']);
const PDF_SIGNATURE = '%PDF-';
const PDF_TITLE_PATTERN = /\/Title\s*\((.*?)\)/s;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const GIF87A_SIGNATURE = 'GIF87a';
const GIF89A_SIGNATURE = 'GIF89a';
const WEBP_RIFF_SIGNATURE = 'RIFF';
const WEBP_SIGNATURE = 'WEBP';
const BMP_SIGNATURE = 'BM';

const normalizeMimeType = (mimeType?: string | null) =>
  mimeType?.split(';')[0]?.trim().toLowerCase() || '';

const stripWrappingQuotes = (value: string) =>
  value.replace(/^['"]+|['"]+$/g, '').trim();

const resolveComposerAttachmentUrl = (rawValue: string) => {
  const normalizedValue = stripWrappingQuotes(rawValue);
  if (!normalizedValue) return null;

  try {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : 'https://example.com/';
    const resolvedUrl = new URL(normalizedValue, baseUrl);
    if (!SUPPORTED_URL_PROTOCOLS.has(resolvedUrl.protocol)) {
      return null;
    }

    return resolvedUrl.toString();
  } catch {
    return null;
  }
};

const extractUrlFromHtmlFragment = (html: string) => {
  for (const pattern of HTML_ATTACHMENT_PATTERNS) {
    const attachmentUrl = html.match(pattern)?.[2];
    if (!attachmentUrl) continue;

    const resolvedUrl = resolveComposerAttachmentUrl(attachmentUrl);
    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  return null;
};

const resolveAttachmentExtension = (
  fileName: string | null,
  url: string,
  mimeType: string
) => {
  if (hasExplicitFileExtension(fileName)) {
    return resolveFileExtension(fileName, null, mimeType);
  }

  const urlPathFileName = extractFileNameFromUrl(url);
  if (hasExplicitFileExtension(urlPathFileName)) {
    return resolveFileExtension(urlPathFileName, null, mimeType);
  }

  return resolveFileExtension(null, null, mimeType);
};

const extractGoogleDriveFileId = (url: string) => {
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

const isChatSharedLinkUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (!CHAT_SHARED_LINK_HOSTNAMES.has(parsedUrl.hostname.toLowerCase())) {
      return false;
    }

    const normalizedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    return normalizedPath.length > 0 && !normalizedPath.startsWith('api/');
  } catch {
    return false;
  }
};

const isKnownAttachmentRemoteAssetUrl = (url: string) =>
  extractGoogleDriveFileId(url) !== null || isChatSharedLinkUrl(url);

const hasSupportedDirectAssetExtension = (url: string) => {
  const extension = resolveAttachmentExtension(null, url, '');
  return extension === 'pdf' || isImageFileExtensionOrMime(extension);
};

const isSupportedAttachmentAssetCandidateUrl = (url: string) =>
  hasSupportedDirectAssetExtension(url) || isKnownAttachmentRemoteAssetUrl(url);

const normalizeAttachmentRemoteAssetUrl = (url: string) => {
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

const sanitizeFileName = (fileName: string) =>
  Array.from(fileName)
    .map(character => {
      const characterCode = character.charCodeAt(0);
      if (characterCode >= 0 && characterCode <= 31) {
        return '_';
      }

      return /[\\/:*?"<>|]/.test(character) ? '_' : character;
    })
    .join('')
    .trim();

const stripFileExtension = (fileName: string) =>
  fileName.replace(/\.[^./]+$/, '');

const hasExplicitFileExtension = (fileName: string | null) => {
  if (!fileName) return false;

  const normalizedName = fileName.split(/[?#]/)[0] || '';
  const lastSegment = normalizedName.split('/').pop() || normalizedName;
  const extensionStartIndex = lastSegment.lastIndexOf('.');

  return (
    extensionStartIndex > 0 && extensionStartIndex < lastSegment.length - 1
  );
};

const extractFileNameFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const rawName = parsedUrl.pathname.split('/').pop();
    if (!rawName) return null;
    return sanitizeFileName(decodeURIComponent(rawName));
  } catch {
    return null;
  }
};

const extractFileNameFromContentDisposition = (
  contentDisposition?: string | null
) => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i
  );
  if (utf8Match?.[1]) {
    try {
      return sanitizeFileName(
        decodeURIComponent(stripWrappingQuotes(utf8Match[1]))
      );
    } catch {
      return sanitizeFileName(stripWrappingQuotes(utf8Match[1]));
    }
  }

  const asciiMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (!asciiMatch?.[1]) return null;

  return sanitizeFileName(stripWrappingQuotes(asciiMatch[1]));
};

const resolveImageMimeType = (extension: string, mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return mimeType;
  }

  return IMAGE_MIME_BY_EXTENSION[extension] || 'image/png';
};

const resolveFileMetadata = ({
  url,
  fileName,
  mimeType,
}: {
  url: string;
  fileName: string | null;
  mimeType: string;
}) => {
  const extension = resolveAttachmentExtension(fileName, url, mimeType);

  if (mimeType === PDF_MIME_TYPE) {
    return {
      extension: 'pdf',
      fileKind: 'document' as const,
      mimeType: PDF_MIME_TYPE,
    };
  }

  if (mimeType.startsWith('image/')) {
    return {
      extension: extension || 'png',
      fileKind: 'image' as const,
      mimeType,
    };
  }

  if (!mimeType || GENERIC_BINARY_MIME_TYPES.has(mimeType)) {
    if (extension === 'pdf') {
      return {
        extension: 'pdf',
        fileKind: 'document' as const,
        mimeType: PDF_MIME_TYPE,
      };
    }

    if (isImageFileExtensionOrMime(extension)) {
      return {
        extension: extension || 'png',
        fileKind: 'image' as const,
        mimeType: resolveImageMimeType(extension, mimeType),
      };
    }
  }

  return null;
};

const sniffPdfMimeTypeFromBlob = async (blob: Blob) => {
  try {
    const headerText = await blob.slice(0, PDF_SIGNATURE.length).text();
    return headerText === PDF_SIGNATURE ? PDF_MIME_TYPE : null;
  } catch {
    return null;
  }
};

const sniffImageMimeTypeFromBlob = async (blob: Blob) => {
  try {
    const headerBytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const headerText = new TextDecoder('ascii').decode(headerBytes);

    const hasPrefix = (signature: readonly number[]) =>
      signature.every((byte, index) => headerBytes[index] === byte);

    if (hasPrefix(PNG_SIGNATURE)) {
      return 'image/png';
    }

    if (hasPrefix(JPEG_SIGNATURE)) {
      return 'image/jpeg';
    }

    if (
      headerText.startsWith(GIF87A_SIGNATURE) ||
      headerText.startsWith(GIF89A_SIGNATURE)
    ) {
      return 'image/gif';
    }

    if (
      headerText.startsWith(WEBP_RIFF_SIGNATURE) &&
      headerText.slice(8, 12) === WEBP_SIGNATURE
    ) {
      return 'image/webp';
    }

    if (headerText.startsWith(BMP_SIGNATURE)) {
      return 'image/bmp';
    }

    return null;
  } catch {
    return null;
  }
};

const extractPdfTitleFileNameFromBlob = async (blob: Blob) => {
  try {
    const previewText = await blob.slice(0, 16_384).text();
    const rawTitle = previewText.match(PDF_TITLE_PATTERN)?.[1];
    if (!rawTitle) {
      return null;
    }

    const normalizedTitle = sanitizeFileName(
      rawTitle
        .replace(/\\([\\()])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (!normalizedTitle) {
      return null;
    }

    return normalizedTitle.toLowerCase().endsWith('.pdf')
      ? normalizedTitle
      : `${normalizedTitle}.pdf`;
  } catch {
    return null;
  }
};

const buildAttachmentFileName = ({
  fileNameHint,
  url,
  contentDisposition,
  mimeType,
  fileKind,
  extension,
}: {
  fileNameHint?: string | null;
  url: string;
  contentDisposition?: string | null;
  mimeType: string;
  fileKind: 'image' | 'document';
  extension: string;
}) => {
  const preferredName =
    fileNameHint ||
    extractFileNameFromContentDisposition(contentDisposition) ||
    extractFileNameFromUrl(url);
  const resolvedExtension =
    resolveAttachmentExtension(preferredName, url, mimeType) || extension;
  const baseName = stripFileExtension(preferredName || '');
  const fallbackBaseName =
    fileKind === 'image' ? 'attachment-image' : 'attachment-document';

  return `${baseName || fallbackBaseName}.${resolvedExtension}`;
};

const extractAttachmentComposerMarkdownLink = (normalizedText: string) => {
  const markdownImageUrl = normalizedText.match(MARKDOWN_IMAGE_PATTERN)?.[1];
  if (markdownImageUrl) {
    const resolvedUrl = resolveComposerAttachmentUrl(markdownImageUrl);
    if (resolvedUrl) {
      return {
        source: 'markdown-attachment' as const,
        url: resolvedUrl,
      };
    }
  }

  const markdownLinkUrl = normalizedText.match(MARKDOWN_LINK_PATTERN)?.[1];
  if (!markdownLinkUrl) return null;

  const resolvedUrl = resolveComposerAttachmentUrl(markdownLinkUrl);
  if (!resolvedUrl || !isSupportedAttachmentAssetCandidateUrl(resolvedUrl)) {
    return null;
  }

  return {
    source: 'markdown-attachment' as const,
    url: resolvedUrl,
  };
};

export const extractAttachmentComposerLinkFromMessageText = (
  rawText: string
): AttachmentComposerLinkMatch | null => {
  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  const directUrl = resolveComposerAttachmentUrl(normalizedText);
  if (directUrl && isSupportedAttachmentAssetCandidateUrl(directUrl)) {
    return {
      source: 'direct-url',
      url: directUrl,
    };
  }

  const markdownAttachment =
    extractAttachmentComposerMarkdownLink(normalizedText);
  if (markdownAttachment) {
    return markdownAttachment;
  }

  const htmlUrl = extractUrlFromHtmlFragment(normalizedText);
  if (!htmlUrl) return null;

  return {
    source: 'html-attachment',
    url: htmlUrl,
  };
};

export const extractAttachmentComposerLinkFromClipboard = ({
  text,
  html,
}: {
  text: string;
  html: string;
}): AttachmentComposerLinkMatch | null => {
  const htmlUrl = html.trim() ? extractUrlFromHtmlFragment(html) : null;
  if (htmlUrl) {
    return {
      source: 'html-attachment',
      url: htmlUrl,
    };
  }

  return extractAttachmentComposerLinkFromMessageText(text.trim());
};

export const extractComposerLinkFromMessageText = (
  rawText: string
): ComposerClipboardLinkMatch | null => {
  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  const attachmentLink =
    extractAttachmentComposerLinkFromMessageText(normalizedText);
  if (attachmentLink) {
    return {
      source: 'attachment',
      pastedText: attachmentLink.url,
      url: attachmentLink.url,
    };
  }

  const [messageLink] = findMessageLinks(normalizedText);
  if (
    !messageLink ||
    messageLink.rangeStart !== 0 ||
    messageLink.rangeEnd !== normalizedText.length
  ) {
    return null;
  }

  return {
    source: 'generic',
    pastedText: messageLink.text,
    url: messageLink.href,
  };
};

export const extractComposerLinkFromClipboard = ({
  text,
  html,
}: {
  text: string;
  html: string;
}): ComposerClipboardLinkMatch | null => {
  const attachmentHtmlUrl = html.trim()
    ? extractUrlFromHtmlFragment(html)
    : null;
  if (attachmentHtmlUrl) {
    return {
      source: 'attachment',
      pastedText: attachmentHtmlUrl,
      url: attachmentHtmlUrl,
    };
  }

  return extractComposerLinkFromMessageText(text);
};

export const fetchAttachmentComposerRemoteFile = async (
  url: string
): Promise<AttachmentComposerRemoteFile | null> => {
  const normalizedUrl = normalizeAttachmentRemoteAssetUrl(url);
  const remoteAsset = (
    await chatRemoteAssetService.fetchRemoteAsset(normalizedUrl, {
      fileNameSourceUrl: url,
    })
  ).data;
  if (!remoteAsset) {
    return null;
  }

  const responseMimeType = normalizeMimeType(
    remoteAsset.contentType || remoteAsset.blob.type
  );
  if (
    responseMimeType.startsWith('text/html') ||
    responseMimeType.startsWith('application/xhtml+xml')
  ) {
    return null;
  }

  const sniffedPdfMimeType = await sniffPdfMimeTypeFromBlob(remoteAsset.blob);
  const sniffedImageMimeType = await sniffImageMimeTypeFromBlob(
    remoteAsset.blob
  );
  const resolvedMimeType =
    responseMimeType === 'application/octet-stream'
      ? sniffedPdfMimeType || sniffedImageMimeType || responseMimeType
      : responseMimeType || sniffedPdfMimeType || sniffedImageMimeType || '';
  const pdfTitleFileName =
    resolvedMimeType === PDF_MIME_TYPE
      ? await extractPdfTitleFileNameFromBlob(remoteAsset.blob)
      : null;
  const resolvedFileNameHint = remoteAsset.fileNameHint || pdfTitleFileName;
  const provisionalFileName =
    resolvedFileNameHint ||
    extractFileNameFromContentDisposition(remoteAsset.contentDisposition) ||
    extractFileNameFromUrl(remoteAsset.sourceUrl);
  const fileMetadata =
    resolveFileMetadata({
      url: remoteAsset.sourceUrl,
      fileName: provisionalFileName,
      mimeType: resolvedMimeType,
    }) ||
    ((resolvedMimeType === 'application/octet-stream' ||
      isKnownAttachmentRemoteAssetUrl(url)) &&
    sniffedPdfMimeType === PDF_MIME_TYPE
      ? {
          extension: 'pdf',
          fileKind: 'document' as const,
          mimeType: PDF_MIME_TYPE,
        }
      : null);
  if (!fileMetadata) {
    return null;
  }

  const normalizedBlob =
    remoteAsset.blob.type === fileMetadata.mimeType
      ? remoteAsset.blob
      : new Blob([remoteAsset.blob], { type: fileMetadata.mimeType });
  const fileName = buildAttachmentFileName({
    fileNameHint: resolvedFileNameHint,
    url: remoteAsset.sourceUrl,
    contentDisposition: remoteAsset.contentDisposition,
    mimeType: fileMetadata.mimeType,
    fileKind: fileMetadata.fileKind,
    extension: fileMetadata.extension,
  });

  return {
    file: new File([normalizedBlob], fileName, {
      type: fileMetadata.mimeType,
    }),
    fileKind: fileMetadata.fileKind,
    sourceUrl: remoteAsset.sourceUrl,
  };
};

export const validateAttachmentComposerLink = async (url: string) => {
  try {
    return (await fetchAttachmentComposerRemoteFile(url)) !== null;
  } catch {
    return false;
  }
};
