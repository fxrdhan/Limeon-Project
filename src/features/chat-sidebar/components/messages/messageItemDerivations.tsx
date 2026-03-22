import type { ReactNode } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type { ComposerPendingFileKind } from '../../types';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../../utils/message-file';
import {
  buildCollapsedSearchSnippet,
  renderHighlightedText,
} from '../../utils/message-search';
import { buildMessageMenuActions, getFileIcon } from './messageItemUtils';

interface BuildMessageItemDerivationsParams {
  message: ChatMessage;
  resolvedMessageUrl: string | null;
  userId?: string;
  openMenuMessageId: string | null;
  menuTransitionSourceId: string | null;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  expandedMessageIds: Set<string>;
  maxMessageChars: number;
  captionMessage?: ChatMessage;
  pdfMessagePreview?: PdfMessagePreview;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  normalizedSearchQuery: string;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      | 'id'
      | 'message'
      | 'file_storage_path'
      | 'file_mime_type'
      | 'file_preview_url'
    >,
    previewName: string,
    initialPreviewUrl?: string | null
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

export interface MessageItemDerivations {
  isCurrentUser: boolean;
  hasAttachmentCaption: boolean;
  displayTime: string;
  isEdited: boolean;
  messageDeliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | null;
  isMenuOpen: boolean;
  isMenuTransitionSource: boolean;
  isFlashingTarget: boolean;
  isSearchMatch: boolean;
  isActiveSearchMatch: boolean;
  isImageMessage: boolean;
  isFileMessage: boolean;
  isImageFileMessage: boolean;
  fileName: string | null;
  fileSecondaryLabel: string | null;
  isPdfFileMessage: boolean;
  resolvedPdfPreviewUrl: string | null;
  pdfMetaLabel: string | null;
  fileIcon: ReactNode;
  bubbleToneClass: string;
  bubbleOpacityClass: string;
  isExpanded: boolean;
  isMessageLong: boolean;
  bubbleWrapperClass: string;
  bubbleSpacingClass: string;
  bubbleTypographyClass: string;
  collapsedSearchSnippet: {
    text: string;
    hasLeadingEllipsis: boolean;
    hasTrailingEllipsis: boolean;
  };
  highlightedMessage: ReactNode;
  highlightedCaption: ReactNode;
  menuActions: ReturnType<typeof buildMessageMenuActions>;
}

export const buildMessageItemDerivations = ({
  message,
  resolvedMessageUrl,
  userId,
  openMenuMessageId,
  menuTransitionSourceId,
  flashingMessageId,
  isFlashHighlightVisible,
  searchMatchedMessageIds,
  activeSearchMessageId,
  expandedMessageIds,
  maxMessageChars,
  captionMessage,
  pdfMessagePreview,
  getAttachmentFileName,
  getAttachmentFileKind,
  normalizedSearchQuery,
  openImageInPortal,
  openDocumentInPortal,
  handleEditMessage,
  handleCopyMessage,
  handleDownloadMessage,
  handleOpenForwardMessagePicker,
  handleDeleteMessage,
}: BuildMessageItemDerivationsParams): MessageItemDerivations => {
  const isCurrentUser = message.sender_id === userId;
  const attachmentCaptionText = captionMessage?.message?.trim() ?? '';
  const hasAttachmentCaption =
    (message.message_type === 'image' || message.message_type === 'file') &&
    attachmentCaptionText.length > 0;
  const displayTime = new Date(message.created_at).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const createdTimestamp = new Date(message.created_at).getTime();
  const updatedTimestamp = new Date(message.updated_at).getTime();
  const isTextMessage = message.message_type === 'text';
  const isEdited =
    isTextMessage &&
    Number.isFinite(createdTimestamp) &&
    Number.isFinite(updatedTimestamp) &&
    updatedTimestamp > createdTimestamp;
  const messageDeliveryStatus = isCurrentUser
    ? message.id.startsWith('temp_')
      ? 'sending'
      : message.is_read
        ? 'read'
        : message.is_delivered
          ? 'delivered'
          : 'sent'
    : null;
  const isMenuOpen = openMenuMessageId === message.id;
  const isMenuTransitionSource = menuTransitionSourceId === message.id;
  const isFlashSequenceTarget = flashingMessageId === message.id;
  const isFlashingTarget = isFlashSequenceTarget && isFlashHighlightVisible;
  const isSearchMatch = searchMatchedMessageIds.has(message.id);
  const isActiveSearchMatch = activeSearchMessageId === message.id;
  const isImageMessage = message.message_type === 'image';
  const isFileMessage = message.message_type === 'file';
  const fileKind = isFileMessage ? getAttachmentFileKind(message) : 'document';
  const isAudioFileMessage = isFileMessage && fileKind === 'audio';
  const fileName = isFileMessage ? getAttachmentFileName(message) : null;
  const fileExtension = isFileMessage
    ? resolveFileExtension(fileName, message.message, message.file_mime_type)
    : '';
  const fileSizeLabel = isFileMessage
    ? formatFileSize(message.file_size)
    : null;
  const fileFallbackLabel = isFileMessage
    ? formatFileFallbackLabel(fileExtension, fileKind)
    : null;
  const fileSecondaryLabel =
    [fileFallbackLabel, fileSizeLabel].filter(Boolean).join(' · ') || null;
  const isPdfFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    (fileExtension === 'pdf' ||
      message.file_mime_type?.toLowerCase().includes('pdf') === true);
  const isImageFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
  const isSquareImageMessage = isImageMessage || isImageFileMessage;
  const persistedPdfPreviewUrl = isPdfFileMessage
    ? (() => {
        const previewUrl = message.file_preview_url?.trim() || null;
        return previewUrl && isDirectChatAssetUrl(previewUrl)
          ? previewUrl
          : null;
      })()
    : null;
  const resolvedPdfPreviewUrl =
    persistedPdfPreviewUrl || pdfMessagePreview?.coverDataUrl || null;
  const resolvedPdfPageCount = isPdfFileMessage
    ? (message.file_preview_page_count ?? pdfMessagePreview?.pageCount)
    : null;
  const pdfMetaLabel = isPdfFileMessage
    ? [
        resolvedPdfPageCount ? `${resolvedPdfPageCount} halaman` : null,
        'PDF',
        fileSizeLabel,
      ]
        .filter(Boolean)
        .join(' · ') || 'PDF'
    : null;
  const fileIcon = getFileIcon(fileExtension, isAudioFileMessage);
  const bubbleToneClass = isFlashingTarget
    ? 'bg-primary text-white'
    : isCurrentUser
      ? 'bg-emerald-200 text-slate-900'
      : 'bg-white text-slate-800';
  const bubbleOpacityClass = isFlashSequenceTarget
    ? isFlashHighlightVisible
      ? 'opacity-100'
      : 'opacity-60'
    : 'opacity-100';
  const isExpanded = expandedMessageIds.has(message.id);
  const isMessageLong =
    !isImageMessage &&
    !isFileMessage &&
    !isExpanded &&
    message.message.length > maxMessageChars;
  const bubbleWrapperClass = isFileMessage
    ? isSquareImageMessage
      ? 'inline-flex w-64 max-w-full flex-col align-top'
      : 'block min-w-0 w-72 max-w-full'
    : isSquareImageMessage
      ? 'inline-flex w-64 max-w-full flex-col align-top'
      : 'block min-w-0 w-fit max-w-full';
  const bubbleSpacingClass = isSquareImageMessage
    ? 'px-2 py-2'
    : isFileMessage
      ? 'px-2 py-2'
      : 'px-3 py-2';
  const bubbleTypographyClass =
    isSquareImageMessage || isFileMessage
      ? ''
      : 'min-w-0 text-sm whitespace-pre-wrap break-words';
  const collapsedSearchSnippet = buildCollapsedSearchSnippet(
    message.message,
    normalizedSearchQuery,
    maxMessageChars
  );
  const displayMessage = isMessageLong
    ? collapsedSearchSnippet.text
    : message.message;
  const highlightedMessage = renderHighlightedText(
    displayMessage,
    normalizedSearchQuery,
    { linkify: !isMessageLong }
  );
  const highlightedCaption = renderHighlightedText(
    attachmentCaptionText,
    normalizedSearchQuery,
    { linkify: true }
  );
  const menuActions = buildMessageMenuActions({
    message,
    isCurrentUser,
    isImageMessage,
    isFileMessage,
    isImageFileMessage,
    isPdfFileMessage,
    fileKind,
    fileName,
    openImageInPortal,
    previewUrl: resolvedMessageUrl,
    openDocumentInPortal,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
  });

  return {
    isCurrentUser,
    hasAttachmentCaption,
    displayTime,
    isEdited,
    messageDeliveryStatus,
    isMenuOpen,
    isMenuTransitionSource,
    isFlashingTarget,
    isSearchMatch,
    isActiveSearchMatch,
    isImageMessage,
    isFileMessage,
    isImageFileMessage,
    fileName,
    fileSecondaryLabel,
    isPdfFileMessage,
    resolvedPdfPreviewUrl,
    pdfMetaLabel,
    fileIcon,
    bubbleToneClass,
    bubbleOpacityClass,
    isExpanded,
    isMessageLong,
    bubbleWrapperClass,
    bubbleSpacingClass,
    bubbleTypographyClass,
    collapsedSearchSnippet,
    highlightedMessage,
    highlightedCaption,
    menuActions,
  };
};
