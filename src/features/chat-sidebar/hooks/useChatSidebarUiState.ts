import { useCallback, useLayoutEffect, useRef } from "react";
import { chatSidebarMessagesGateway, type ChatMessage } from "../data/chatSidebarGateway";
import type { AttachmentCaptionData } from "../utils/message-derivations";
import { buildMessageRenderItems } from "../utils/message-render-items";
import { useChatComposer } from "./useChatComposer";
import { useChatSidebarPreviewState } from "./useChatSidebarPreviewState";
import { useChatSidebarRefs } from "./useChatSidebarRefs";
import { useChatViewport } from "./useChatViewport";

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
  mergeSearchContextMessages: (searchContextMessages: ChatMessage[]) => void;
  refs: ReturnType<typeof useChatSidebarRefs>;
  closeMessageMenu: () => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (targetMessage: ChatMessage) => "audio" | "document";
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
  mergeSearchContextMessages,
  refs,
  closeMessageMenu,
  getAttachmentFileName,
  getAttachmentFileKind,
  captionData,
}: UseChatSidebarUiStateProps) => {
  const loadingReplyContextMessageIdRef = useRef<string | null>(null);
  const pendingReplyTargetViewportSnapshotRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
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
    pendingComposerAttachmentsCount: composer.composerAttachmentPreviewItems.length,
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
  refs.scheduleScrollMessagesToBottomRef.current = viewport.scheduleScrollMessagesToBottom;

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

  const getReplyTargetImageGroup = useCallback(
    (messageId: string, availableMessages: ChatMessage[]) =>
      buildMessageRenderItems({
        messages: availableMessages,
        captionMessagesByAttachmentId: captionData.captionMessagesByAttachmentId,
        getAttachmentFileKind,
        enableImageBubbleGrouping: true,
        enableDocumentBubbleGrouping: true,
      }).find(
        (renderItem) =>
          renderItem.kind === "image-group" &&
          renderItem.messages.some((message) => message.id === messageId),
      ),
    [captionData.captionMessagesByAttachmentId, getAttachmentFileKind],
  );

  const scheduleReplyTargetViewportFocus = useCallback(
    (messageId: string) => {
      let remainingFrames = 12;

      const focusWhenBubbleReady = () => {
        if (refs.messageBubbleRefs.current.has(messageId)) {
          viewport.focusReplyTargetMessage(messageId);
          return;
        }

        if (remainingFrames <= 0) {
          viewport.focusReplyTargetMessage(messageId);
          return;
        }

        remainingFrames -= 1;
        requestAnimationFrame(focusWhenBubbleReady);
      };

      requestAnimationFrame(focusWhenBubbleReady);
    },
    [refs.messageBubbleRefs, viewport],
  );

  useLayoutEffect(() => {
    const pendingViewportSnapshot = pendingReplyTargetViewportSnapshotRef.current;
    if (!pendingViewportSnapshot) {
      return;
    }

    pendingReplyTargetViewportSnapshotRef.current = null;

    const messagesContainer = refs.messagesContainerRef.current;
    if (!messagesContainer) {
      return;
    }

    const scrollHeightDelta = messagesContainer.scrollHeight - pendingViewportSnapshot.scrollHeight;
    if (scrollHeightDelta <= 0) {
      return;
    }

    messagesContainer.scrollTop = pendingViewportSnapshot.scrollTop + scrollHeightDelta;
  }, [messages, refs.messagesContainerRef]);

  const focusReplyTargetFromMessages = useCallback(
    (messageId: string, availableMessages: ChatMessage[]) => {
      const { openImageGroupInPortal } = previews;
      const replyingMessage =
        availableMessages.find((candidate) => candidate.id === messageId) || null;
      if (!replyingMessage) {
        return false;
      }

      const imageGroupRenderItem = getReplyTargetImageGroup(messageId, availableMessages);

      if (imageGroupRenderItem?.kind === "image-group") {
        scheduleReplyTargetViewportFocus(messageId);
        void openImageGroupInPortal(
          imageGroupRenderItem.messages,
          messageId,
          replyingMessage.file_preview_url || null,
        );
        return true;
      }

      viewport.focusReplyTargetMessage(messageId);
      return true;
    },
    [getReplyTargetImageGroup, previews, scheduleReplyTargetViewportFocus, viewport],
  );

  const focusReplyTargetMessage = useCallback(
    (messageId: string) => {
      if (focusReplyTargetFromMessages(messageId, messages)) {
        return;
      }

      if (
        !isOpen ||
        !targetUserId ||
        !currentChannelId ||
        loadingReplyContextMessageIdRef.current === messageId
      ) {
        return;
      }

      loadingReplyContextMessageIdRef.current = messageId;
      void (async () => {
        try {
          const { data: searchContextMessages, error } =
            await chatSidebarMessagesGateway.fetchConversationMessageContext(
              targetUserId,
              messageId,
            );
          if (error || !searchContextMessages || searchContextMessages.length === 0) {
            if (error) {
              console.error("Error loading reply target context:", error);
            }
            return;
          }

          const messagesContainer = refs.messagesContainerRef.current;
          pendingReplyTargetViewportSnapshotRef.current = messagesContainer
            ? {
                scrollTop: messagesContainer.scrollTop,
                scrollHeight: messagesContainer.scrollHeight,
              }
            : null;

          mergeSearchContextMessages(searchContextMessages);

          const mergedMessages = [...messages, ...searchContextMessages].reduce<
            Map<string, ChatMessage>
          >((messagesById, messageItem) => {
            messagesById.set(messageItem.id, messageItem);
            return messagesById;
          }, new Map());
          const orderedMergedMessages = [...mergedMessages.values()].sort(
            (leftMessage, rightMessage) => {
              const createdAtOrder = leftMessage.created_at.localeCompare(rightMessage.created_at);
              if (createdAtOrder !== 0) {
                return createdAtOrder;
              }

              return leftMessage.id.localeCompare(rightMessage.id);
            },
          );

          const imageGroupRenderItem = getReplyTargetImageGroup(messageId, orderedMergedMessages);
          if (imageGroupRenderItem?.kind === "image-group") {
            scheduleReplyTargetViewportFocus(messageId);
            void previews.openImageGroupInPortal(
              imageGroupRenderItem.messages,
              messageId,
              searchContextMessages.find((message) => message.id === messageId)?.file_preview_url ||
                null,
            );
            return;
          }

          scheduleReplyTargetViewportFocus(messageId);
        } finally {
          if (loadingReplyContextMessageIdRef.current === messageId) {
            loadingReplyContextMessageIdRef.current = null;
          }
        }
      })();
    },
    [
      currentChannelId,
      getReplyTargetImageGroup,
      focusReplyTargetFromMessages,
      isOpen,
      mergeSearchContextMessages,
      messages,
      previews,
      scheduleReplyTargetViewportFocus,
      refs.messagesContainerRef,
      targetUserId,
    ],
  );

  const toggleMessageMenu = useCallback(
    (anchor: HTMLElement, messageId: string, preferredSide: "left" | "right") => {
      composer.closeAttachModal();
      previews.closeImageActionsMenu();
      viewport.toggleMessageMenu(anchor, messageId, preferredSide);
    },
    [composer, previews, viewport],
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
