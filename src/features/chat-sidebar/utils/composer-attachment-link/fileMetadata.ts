import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../message-file';
import { stripWrappingQuotes } from './urlParsing';

const GENERIC_BINARY_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
]);
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
const PDF_SIGNATURE = '%PDF-';
const PDF_TITLE_PATTERN = /\/Title\s*\((.*?)\)/s;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const GIF87A_SIGNATURE = 'GIF87a';
const GIF89A_SIGNATURE = 'GIF89a';
const WEBP_RIFF_SIGNATURE = 'RIFF';
const WEBP_SIGNATURE = 'WEBP';
const BMP_SIGNATURE = 'BM';

export const normalizeMimeType = (mimeType?: string | null) =>
  mimeType?.split(';')[0]?.trim().toLowerCase() || '';

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

export const extractFileNameFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const rawName = parsedUrl.pathname.split('/').pop();
    if (!rawName) return null;
    return sanitizeFileName(decodeURIComponent(rawName));
  } catch {
    return null;
  }
};

export const extractFileNameFromContentDisposition = (
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

export const resolveAttachmentExtension = (
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

const resolveImageMimeType = (extension: string, mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return mimeType;
  }

  return IMAGE_MIME_BY_EXTENSION[extension] || 'image/png';
};

export const resolveFileMetadata = ({
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

export const sniffPdfMimeTypeFromBlob = async (blob: Blob) => {
  try {
    const headerText = await blob.slice(0, PDF_SIGNATURE.length).text();
    return headerText === PDF_SIGNATURE ? PDF_MIME_TYPE : null;
  } catch {
    return null;
  }
};

export const sniffImageMimeTypeFromBlob = async (blob: Blob) => {
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

export const extractPdfTitleFileNameFromBlob = async (blob: Blob) => {
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

export const buildAttachmentFileName = ({
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
