import { useCallback } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import { buildMessageRenderItems } from '../utils/message-render-items';
import {
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../utils/message-file';
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

  const focusReplyTargetMessage = useCallback(
    (messageId: string) => {
      const { openImageGroupInPortal, openImageInPortal } = previews;
      const replyingMessage = messages.find(
        candidate => candidate.id === messageId
      );
      if (!replyingMessage) {
        return;
      }

      const attachmentFileName = getAttachmentFileName(replyingMessage);
      const fileExtension = resolveFileExtension(
        attachmentFileName,
        replyingMessage.message,
        replyingMessage.file_mime_type
      );
      const imageGroupRenderItem = buildMessageRenderItems({
        messages,
        captionMessagesByAttachmentId:
          captionData.captionMessagesByAttachmentId,
        getAttachmentFileKind,
        enableDocumentBubbleGrouping: true,
      }).find(
        renderItem =>
          renderItem.kind === 'image-group' &&
          renderItem.messages.some(message => message.id === messageId)
      );

      if (imageGroupRenderItem?.kind === 'image-group') {
        void openImageGroupInPortal(
          imageGroupRenderItem.messages,
          messageId,
          replyingMessage.file_preview_url || null
        );
        return;
      }

      const isImageReply =
        replyingMessage.message_type === 'image' ||
        isImageFileExtensionOrMime(
          fileExtension,
          replyingMessage.file_mime_type
        );

      if (isImageReply) {
        void openImageInPortal(
          replyingMessage,
          attachmentFileName || 'Gambar',
          replyingMessage.file_preview_url || null
        );
        return;
      }

      viewport.focusReplyTargetMessage(messageId);
    },
    [
      captionData.captionMessagesByAttachmentId,
      getAttachmentFileKind,
      getAttachmentFileName,
      messages,
      previews,
      viewport,
    ]
  );

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
    viewport: {
      ...viewport,
      focusReplyTargetMessage,
    },
    previews,
    focusMessageComposer,
    toggleMessageMenu,
  };
};
