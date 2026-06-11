import { chatSidebarAttachmentGateway } from '../../data/chatSidebarGateway';
import {
  buildAttachmentFileName,
  extractFileNameFromContentDisposition,
  extractFileNameFromUrl,
  extractPdfTitleFileNameFromBlob,
  normalizeMimeType,
  resolveFileMetadata,
  sniffImageMimeTypeFromBlob,
  sniffPdfMimeTypeFromBlob,
} from './fileMetadata';
import {
  isKnownAttachmentRemoteAssetUrl,
  normalizeAttachmentRemoteAssetUrl,
} from './sharedLinks';
import type { AttachmentComposerRemoteFile } from './types';

const PDF_MIME_TYPE = 'application/pdf';

export const fetchAttachmentComposerRemoteFile = async (
  url: string
): Promise<AttachmentComposerRemoteFile | null> => {
  const normalizedUrl = normalizeAttachmentRemoteAssetUrl(url);
  const remoteAsset = (
    await chatSidebarAttachmentGateway.fetchRemoteAsset(normalizedUrl, {
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
