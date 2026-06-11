import type { ChatMessage } from '../../data/chatSidebarGateway';
import {
  buildPdfMessagePreviewCacheKey,
  isPdfPreviewableMessage,
} from '../../utils/pdf-message-preview';

export interface PdfPreviewMessageAccessors {
  getAttachmentFileKind: (message: ChatMessage) => 'audio' | 'document';
  getAttachmentFileName: (message: ChatMessage) => string;
}

export interface PdfPreviewableMessage {
  cacheKey: string;
  fileName: string;
  message: ChatMessage;
}

export const getPdfPreviewableMessage = (
  message: ChatMessage,
  accessors: PdfPreviewMessageAccessors
): PdfPreviewableMessage | null => {
  if (message.message_type !== 'file') return null;
  if (accessors.getAttachmentFileKind(message) !== 'document') return null;

  const fileName = accessors.getAttachmentFileName(message);
  if (!isPdfPreviewableMessage(message, fileName)) return null;

  return {
    cacheKey: buildPdfMessagePreviewCacheKey(message, fileName),
    fileName,
    message,
  };
};

export const getPdfPreviewableMessages = (
  messages: ChatMessage[],
  accessors: PdfPreviewMessageAccessors
) =>
  messages.flatMap(message => {
    const previewableMessage = getPdfPreviewableMessage(message, accessors);
    return previewableMessage ? [previewableMessage] : [];
  });

export const getActivePdfMessageIds = (
  messages: ChatMessage[],
  accessors: PdfPreviewMessageAccessors
) =>
  new Set(
    getPdfPreviewableMessages(messages, accessors).map(
      ({ message }) => message.id
    )
  );
