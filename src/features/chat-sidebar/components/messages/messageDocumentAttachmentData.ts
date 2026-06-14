import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../utils/pdf-message-preview';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../../utils/message-file';
import { getPdfMessagePreviewUrl } from '../../utils/pdf-message-preview';

export const getDocumentAttachmentData = ({
  fileName,
  getPdfMessagePreview,
  message,
}: {
  fileName: string;
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  message: ChatMessage;
}) => {
  const fileExtension = resolveFileExtension(
    fileName,
    message.message,
    message.file_mime_type
  );
  const isImageFile = isImageFileExtensionOrMime(
    fileExtension,
    message.file_mime_type
  );
  const isPdfFile =
    fileExtension === 'pdf' ||
    message.file_mime_type?.toLowerCase().includes('pdf') === true;
  const previewUrl = message.file_preview_url?.trim() || null;
  const persistedPdfPreviewUrl =
    isPdfFile && previewUrl && isDirectChatAssetUrl(previewUrl)
      ? previewUrl
      : null;
  const resolvedPdfPreviewUrl = isPdfFile
    ? persistedPdfPreviewUrl ||
      getPdfMessagePreviewUrl(getPdfMessagePreview(message, fileName)) ||
      null
    : null;
  const fileSizeLabel = formatFileSize(message.file_size);
  const fileTypeLabel = formatFileFallbackLabel(fileExtension, 'document');
  const fileSecondaryLabel =
    [fileTypeLabel, fileSizeLabel].filter(Boolean).join(' · ') || fileTypeLabel;

  return {
    fileExtension,
    fileSecondaryLabel,
    isImageFile,
    isPdfFile,
    resolvedPdfPreviewUrl,
  };
};
