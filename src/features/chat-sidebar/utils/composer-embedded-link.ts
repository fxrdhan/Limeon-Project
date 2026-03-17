import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from './message-file';
import { chatRemoteAssetService } from '@/services/api/chat/remote-asset.service';

export interface EmbeddedComposerLinkMatch {
  source: 'direct-url' | 'html-embed' | 'markdown-embed';
  url: string;
}

export interface EmbeddedComposerRemoteFile {
  file: File;
  fileKind: 'image' | 'document';
  sourceUrl: string;
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
const HTML_EMBED_PATTERNS = [
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

const normalizeMimeType = (mimeType?: string | null) =>
  mimeType?.split(';')[0]?.trim().toLowerCase() || '';

const stripWrappingQuotes = (value: string) =>
  value.replace(/^['"]+|['"]+$/g, '').trim();

const resolveComposerEmbeddedUrl = (rawValue: string) => {
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
  for (const pattern of HTML_EMBED_PATTERNS) {
    const embeddedUrl = html.match(pattern)?.[2];
    if (!embeddedUrl) continue;

    const resolvedUrl = resolveComposerEmbeddedUrl(embeddedUrl);
    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  return null;
};

const resolveEmbeddedExtension = (
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

const hasSupportedDirectAssetExtension = (url: string) => {
  const extension = resolveEmbeddedExtension(null, url, '');
  return extension === 'pdf' || isImageFileExtensionOrMime(extension);
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
  const extension = resolveEmbeddedExtension(fileName, url, mimeType);

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

const buildEmbeddedFileName = ({
  url,
  contentDisposition,
  mimeType,
  fileKind,
  extension,
}: {
  url: string;
  contentDisposition?: string | null;
  mimeType: string;
  fileKind: 'image' | 'document';
  extension: string;
}) => {
  const preferredName =
    extractFileNameFromContentDisposition(contentDisposition) ||
    extractFileNameFromUrl(url);
  const resolvedExtension =
    resolveEmbeddedExtension(preferredName, url, mimeType) || extension;
  const baseName = stripFileExtension(preferredName || '');
  const fallbackBaseName =
    fileKind === 'image' ? 'embedded-image' : 'embedded-document';

  return `${baseName || fallbackBaseName}.${resolvedExtension}`;
};

const extractEmbeddedComposerMarkdownLink = (normalizedText: string) => {
  const markdownImageUrl = normalizedText.match(MARKDOWN_IMAGE_PATTERN)?.[1];
  if (markdownImageUrl) {
    const resolvedUrl = resolveComposerEmbeddedUrl(markdownImageUrl);
    if (resolvedUrl) {
      return {
        source: 'markdown-embed' as const,
        url: resolvedUrl,
      };
    }
  }

  const markdownLinkUrl = normalizedText.match(MARKDOWN_LINK_PATTERN)?.[1];
  if (!markdownLinkUrl) return null;

  const resolvedUrl = resolveComposerEmbeddedUrl(markdownLinkUrl);
  if (!resolvedUrl || !hasSupportedDirectAssetExtension(resolvedUrl)) {
    return null;
  }

  return {
    source: 'markdown-embed' as const,
    url: resolvedUrl,
  };
};

export const extractEmbeddedComposerLinkFromMessageText = (
  rawText: string
): EmbeddedComposerLinkMatch | null => {
  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  const directUrl = resolveComposerEmbeddedUrl(normalizedText);
  if (directUrl && hasSupportedDirectAssetExtension(directUrl)) {
    return {
      source: 'direct-url',
      url: directUrl,
    };
  }

  const markdownEmbed = extractEmbeddedComposerMarkdownLink(normalizedText);
  if (markdownEmbed) {
    return markdownEmbed;
  }

  const htmlUrl = extractUrlFromHtmlFragment(normalizedText);
  if (!htmlUrl) return null;

  return {
    source: 'html-embed',
    url: htmlUrl,
  };
};

export const extractEmbeddedComposerLinkFromClipboard = ({
  text,
  html,
}: {
  text: string;
  html: string;
}): EmbeddedComposerLinkMatch | null => {
  const htmlUrl = html.trim() ? extractUrlFromHtmlFragment(html) : null;
  if (htmlUrl) {
    return {
      source: 'html-embed',
      url: htmlUrl,
    };
  }

  return extractEmbeddedComposerLinkFromMessageText(text.trim());
};

export const fetchEmbeddedComposerRemoteFile = async (
  url: string
): Promise<EmbeddedComposerRemoteFile | null> => {
  const remoteAsset = (await chatRemoteAssetService.fetchRemoteAsset(url)).data;
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

  const provisionalFileName =
    extractFileNameFromContentDisposition(remoteAsset.contentDisposition) ||
    extractFileNameFromUrl(remoteAsset.sourceUrl);
  const fileMetadata = resolveFileMetadata({
    url: remoteAsset.sourceUrl,
    fileName: provisionalFileName,
    mimeType: responseMimeType,
  });
  if (!fileMetadata) {
    return null;
  }

  const normalizedBlob =
    remoteAsset.blob.type === fileMetadata.mimeType
      ? remoteAsset.blob
      : new Blob([remoteAsset.blob], { type: fileMetadata.mimeType });
  const fileName = buildEmbeddedFileName({
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
