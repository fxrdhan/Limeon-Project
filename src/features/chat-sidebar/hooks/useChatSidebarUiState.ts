import { useCallback } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import { useChatComposer } from './useChatComposer';
import { useChatSidebarPreviewState } from './useChatSidebarPreviewState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatViewport } from './useChatViewport';

interface UseChatSidebarUiStateProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  userId?: string;
  targetUserId?: string;
  normalizedMessageSearchQuery: string;
  isMessageSearchMode: boolean;
  activeSearchMessageId: string | null;
  searchNavigationTick: number;
  markMessageIdsAsRead: (messageIds: string[]) => Promise<void>;
  refs: ReturnType<typeof useChatSidebarRefs>;
  closeMessageMenu: () => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (targetMessage: ChatMessage) => 'audio' | 'document';
  captionData: AttachmentCaptionData;
}

export const useChatSidebarUiState = ({
  isOpen,
  currentChannelId,
  messages,
  loading,
  userId,
  targetUserId,
  normalizedMessageSearchQuery,
  isMessageSearchMode,
  activeSearchMessageId,
  searchNavigationTick,
  markMessageIdsAsRead,
  refs,
  closeMessageMenu,
  getAttachmentFileName,
  getAttachmentFileKind,
  captionData,
}: UseChatSidebarUiStateProps) => {
  const focusMessageComposer = useCallback(() => {
    const textarea = refs.messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [refs.messageInputRef]);

  const composer = useChatComposer({
    isOpen,
    currentChannelId,
    messages,
    closeMessageMenu,
    messageInputRef: refs.messageInputRef,
  });

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages,
    userId,
    targetUserId,
    messagesCount: messages.length,
    loading,
    messageInputHeight: composer.messageInputHeight,
    composerContextualOffset: composer.composerContextualOffset,
    isMessageInputMultiline: composer.isMessageInputMultiline,
    pendingComposerAttachmentsCount:
      composer.composerAttachmentPreviewItems.length,
    normalizedMessageSearchQuery,
    isMessageSearchMode,
    activeSearchMessageId,
    searchNavigationTick,
    editingMessageId: composer.editingMessageId,
    focusMessageComposer,
    markMessageIdsAsRead,
    messagesContainerRef: refs.messagesContainerRef,
    messagesContentRef: refs.messagesContentRef,
    messagesEndRef: refs.messagesEndRef,
    composerContainerRef: refs.composerContainerRef,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    messageBubbleRefs: refs.messageBubbleRefs,
  });

  refs.closeMessageMenuRef.current = viewport.closeMessageMenu;
  refs.scheduleScrollMessagesToBottomRef.current =
    viewport.scheduleScrollMessagesToBottom;

  const previews = useChatSidebarPreviewState({
    currentChannelId,
    messages,
    messagesContainerRef: refs.messagesContainerRef,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    messageBubbleRefs: refs.messageBubbleRefs,
    getVisibleMessagesBounds: viewport.getVisibleMessagesBounds,
    pendingComposerAttachments: composer.pendingComposerAttachments,
    closeMessageMenu,
    handleAttachImageClick: composer.handleAttachImageClick,
    handleAttachDocumentClick: composer.handleAttachDocumentClick,
    compressPendingComposerImage: composer.compressPendingComposerImage,
    compressPendingComposerPdf: composer.compressPendingComposerPdf,
    removePendingComposerAttachment: composer.removePendingComposerAttachment,
    openComposerImagePreview: composer.openComposerImagePreview,
    getAttachmentFileName,
    getAttachmentFileKind,
    captionData,
  });

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      composer.closeAttachModal();
      previews.closeImageActionsMenu();
      viewport.toggleMessageMenu(anchor, messageId, preferredSide);
    },
    [composer, previews, viewport]
  );

  return {
    composer,
    viewport,
    previews,
    focusMessageComposer,
    toggleMessageMenu,
  };
};
