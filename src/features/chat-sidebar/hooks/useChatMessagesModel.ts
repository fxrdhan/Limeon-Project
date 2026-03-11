import { useMemo, type MutableRefObject, type RefObject } from 'react';
import type { MessagesPaneModel } from '../components/MessagesPane';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PdfMessagePreview } from './useMessagePdfPreviews';

interface UseChatMessagesModelProps {
  loading: boolean;
  loadError: string | null;
  messages: ChatMessage[];
  user?: {
    id?: string;
    name?: string;
  } | null;
  normalizedMessageSearchQuery: string;
  messageInputHeight: number;
  composerContextualOffset: number;
  composerContainerHeight: number;
  openMenuMessageId: string | null;
  menuPlacement: MessagesPaneModel['menuPlacement'];
  menuSideAnchor: MessagesPaneModel['menuSideAnchor'];
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  searchMatchedMessageIdSet: Set<string>;
  activeSearchMessageId: string | null;
  isMessageSearchMode: boolean;
  hasNewMessages: boolean;
  isAtBottom: boolean;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  olderMessagesError: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  captionMessagesByAttachmentId: Map<string, ChatMessage>;
  captionMessageIds: Set<string>;
  closeViewportMessageMenu: () => void;
  toggleMessageMenu: MessagesPaneModel['toggleMessageMenu'];
  handleToggleExpand: (messageId: string) => void;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  handleToggleMessageSelection: (messageId: string) => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: MessagesPaneModel['getAttachmentFileKind'];
  getImageMessageUrl: (
    message: Pick<ChatMessage, 'id' | 'message' | 'message_type'>
  ) => string | null;
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  documentPreviewUrl: string | null;
  documentPreviewName: string;
  isDocumentPreviewVisible: boolean;
  closeDocumentPreview: () => void;
  imagePreviewUrl: string | null;
  imagePreviewName: string;
  isImagePreviewVisible: boolean;
  closeImagePreview: () => void;
  openImageInPortal: MessagesPaneModel['openImageInPortal'];
  openDocumentInPortal: MessagesPaneModel['openDocumentInPortal'];
  scrollToBottom: () => void;
  loadOlderMessages: () => void;
  retryLoadMessages: () => void;
}

export const useChatMessagesModel = ({
  loading,
  loadError,
  messages,
  user,
  normalizedMessageSearchQuery,
  messageInputHeight,
  composerContextualOffset,
  composerContainerHeight,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  shouldAnimateMenuOpen,
  menuTransitionSourceId,
  menuOffsetX,
  expandedMessageIds,
  flashingMessageId,
  isFlashHighlightVisible,
  isSelectionMode,
  selectedMessageIds,
  searchMatchedMessageIdSet,
  activeSearchMessageId,
  isMessageSearchMode,
  hasNewMessages,
  isAtBottom,
  hasOlderMessages,
  isLoadingOlderMessages,
  olderMessagesError,
  messagesContainerRef,
  messagesEndRef,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  captionMessagesByAttachmentId,
  captionMessageIds,
  closeViewportMessageMenu,
  toggleMessageMenu,
  handleToggleExpand,
  handleEditMessage,
  handleCopyMessage,
  handleDownloadMessage,
  handleDeleteMessage,
  handleToggleMessageSelection,
  getAttachmentFileName,
  getAttachmentFileKind,
  getImageMessageUrl,
  getPdfMessagePreview,
  documentPreviewUrl,
  documentPreviewName,
  isDocumentPreviewVisible,
  closeDocumentPreview,
  imagePreviewUrl,
  imagePreviewName,
  isImagePreviewVisible,
  closeImagePreview,
  openImageInPortal,
  openDocumentInPortal,
  scrollToBottom,
  loadOlderMessages,
  retryLoadMessages,
}: UseChatMessagesModelProps) =>
  useMemo<MessagesPaneModel>(
    () => ({
      loading,
      loadError,
      messages,
      user,
      normalizedSearchQuery: normalizedMessageSearchQuery,
      messageInputHeight,
      composerContextualOffset,
      composerContainerHeight,
      openMenuMessageId,
      menuPlacement,
      menuSideAnchor,
      shouldAnimateMenuOpen,
      menuTransitionSourceId,
      menuOffsetX,
      expandedMessageIds,
      flashingMessageId,
      isFlashHighlightVisible,
      isSelectionMode,
      selectedMessageIds,
      searchMatchedMessageIds: isMessageSearchMode
        ? searchMatchedMessageIdSet
        : new Set<string>(),
      activeSearchMessageId: isMessageSearchMode ? activeSearchMessageId : null,
      showScrollToBottom: hasNewMessages || !isAtBottom,
      hasOlderMessages,
      isLoadingOlderMessages,
      olderMessagesError,
      messagesContainerRef,
      messagesEndRef,
      messageBubbleRefs,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
      captionMessagesByAttachmentId,
      captionMessageIds,
      closeMessageMenu: closeViewportMessageMenu,
      toggleMessageMenu,
      handleToggleExpand,
      handleEditMessage,
      handleCopyMessage,
      handleDownloadMessage,
      handleDeleteMessage,
      onToggleMessageSelection: handleToggleMessageSelection,
      getAttachmentFileName,
      getAttachmentFileKind,
      getImageMessageUrl,
      getPdfMessagePreview,
      documentPreviewUrl,
      documentPreviewName,
      isDocumentPreviewVisible,
      closeDocumentPreview,
      imagePreviewUrl,
      imagePreviewName,
      isImagePreviewVisible,
      closeImagePreview,
      openImageInPortal,
      openDocumentInPortal,
      onScrollToBottom: scrollToBottom,
      onLoadOlderMessages: loadOlderMessages,
      onRetryLoadMessages: retryLoadMessages,
    }),
    [
      activeSearchMessageId,
      captionMessageIds,
      captionMessagesByAttachmentId,
      closeDocumentPreview,
      closeImagePreview,
      closeViewportMessageMenu,
      composerContainerHeight,
      composerContextualOffset,
      documentPreviewName,
      documentPreviewUrl,
      expandedMessageIds,
      flashingMessageId,
      getAttachmentFileKind,
      getAttachmentFileName,
      getImageMessageUrl,
      getPdfMessagePreview,
      handleCopyMessage,
      handleDeleteMessage,
      handleDownloadMessage,
      handleEditMessage,
      handleToggleExpand,
      handleToggleMessageSelection,
      hasNewMessages,
      hasOlderMessages,
      imagePreviewName,
      imagePreviewUrl,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
      isAtBottom,
      isDocumentPreviewVisible,
      isFlashHighlightVisible,
      isImagePreviewVisible,
      isLoadingOlderMessages,
      isMessageSearchMode,
      isSelectionMode,
      loadError,
      loadOlderMessages,
      loading,
      menuOffsetX,
      menuPlacement,
      menuSideAnchor,
      menuTransitionSourceId,
      messageBubbleRefs,
      messageInputHeight,
      messages,
      messagesContainerRef,
      messagesEndRef,
      normalizedMessageSearchQuery,
      olderMessagesError,
      openDocumentInPortal,
      openImageInPortal,
      openMenuMessageId,
      retryLoadMessages,
      scrollToBottom,
      searchMatchedMessageIdSet,
      selectedMessageIds,
      shouldAnimateMenuOpen,
      toggleMessageMenu,
      user,
    ]
  );
