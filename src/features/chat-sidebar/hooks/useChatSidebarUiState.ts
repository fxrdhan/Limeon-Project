import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import { buildMessageRenderItems } from '../utils/message-render-items';
import { useChatComposer } from './useChatComposer';
import type { MergeSearchContextMessagesOptions } from './useChatSession';
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
  mergeSearchContextMessages: (
    searchContextMessages: ChatMessage[],
    options?: MergeSearchContextMessagesOptions
  ) => void;
  refs: ReturnType<typeof useChatSidebarRefs>;
  closeMessageMenu: () => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (targetMessage: ChatMessage) => 'audio' | 'document';
  captionData: AttachmentCaptionData;
}

const REPLY_TARGET_CONTEXT_BEFORE_LIMIT = 20;
const REPLY_TARGET_CONTEXT_AFTER_LIMIT = 20;

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
  const pendingReplyTargetFocusMessageIdRef = useRef<string | null>(null);
  const pendingReplyTargetFocusFrameRef = useRef<number | null>(null);
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
    userId,
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

  const getReplyTargetImageGroup = useCallback(
    (messageId: string, availableMessages: ChatMessage[]) =>
      buildMessageRenderItems({
        messages: availableMessages,
        captionMessagesByAttachmentId:
          captionData.captionMessagesByAttachmentId,
        getAttachmentFileKind,
        enableImageBubbleGrouping: true,
        enableDocumentBubbleGrouping: true,
      }).find(
        renderItem =>
          renderItem.kind === 'image-group' &&
          renderItem.messages.some(message => message.id === messageId)
      ),
    [captionData.captionMessagesByAttachmentId, getAttachmentFileKind]
  );

  const getReplyTargetContextHasOlderMessages = useCallback(
    (messageId: string, contextMessages: ChatMessage[]) => {
      const targetMessage = contextMessages.find(
        messageItem => messageItem.id === messageId
      );
      if (!targetMessage) {
        return undefined;
      }

      const replyTargetAndOlderCount = contextMessages.filter(messageItem => {
        const createdAtOrder = messageItem.created_at.localeCompare(
          targetMessage.created_at
        );
        return (
          createdAtOrder < 0 ||
          (createdAtOrder === 0 &&
            messageItem.id.localeCompare(targetMessage.id) <= 0)
        );
      }).length;

      return replyTargetAndOlderCount > REPLY_TARGET_CONTEXT_BEFORE_LIMIT;
    },
    []
  );

  const confirmReplyTargetContextHasOlderMessages = useCallback(
    async (
      targetConversationUserId: string,
      contextMessages: ChatMessage[],
      inferredHasOlderMessages: boolean | undefined
    ) => {
      if (!inferredHasOlderMessages) {
        return inferredHasOlderMessages;
      }

      const oldestContextMessage = contextMessages.reduce<ChatMessage | null>(
        (oldestMessage, messageItem) => {
          if (!oldestMessage) {
            return messageItem;
          }

          const createdAtOrder = messageItem.created_at.localeCompare(
            oldestMessage.created_at
          );
          return createdAtOrder < 0 ||
            (createdAtOrder === 0 &&
              messageItem.id.localeCompare(oldestMessage.id) < 0)
            ? messageItem
            : oldestMessage;
        },
        null
      );
      if (!oldestContextMessage) {
        return inferredHasOlderMessages;
      }

      const { data: olderMessagesPage, error } =
        await chatSidebarMessagesGateway.fetchConversationMessages(
          targetConversationUserId,
          {
            beforeCreatedAt: oldestContextMessage.created_at,
            beforeId: oldestContextMessage.id,
            limit: 1,
          }
        );

      if (error || !olderMessagesPage) {
        if (error) {
          console.error('Error checking reply target older messages:', error);
        }
        return inferredHasOlderMessages;
      }

      return olderMessagesPage.messages.length > 0;
    },
    []
  );

  const cancelPendingReplyTargetFocusFrame = useCallback(() => {
    if (pendingReplyTargetFocusFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(pendingReplyTargetFocusFrameRef.current);
    pendingReplyTargetFocusFrameRef.current = null;
  }, []);

  const scheduleReplyTargetViewportFocus = useCallback(
    (messageId: string) => {
      pendingReplyTargetFocusMessageIdRef.current = messageId;
      cancelPendingReplyTargetFocusFrame();
      let remainingFrames = 60;

      const focusWhenBubbleReady = () => {
        if (pendingReplyTargetFocusMessageIdRef.current !== messageId) {
          pendingReplyTargetFocusFrameRef.current = null;
          return;
        }

        if (refs.messageBubbleRefs.current.has(messageId)) {
          pendingReplyTargetFocusMessageIdRef.current = null;
          pendingReplyTargetFocusFrameRef.current = null;
          viewport.focusReplyTargetMessage(messageId);
          return;
        }

        if (remainingFrames <= 0) {
          pendingReplyTargetFocusFrameRef.current = null;
          viewport.focusReplyTargetMessage(messageId);
          return;
        }

        remainingFrames -= 1;
        pendingReplyTargetFocusFrameRef.current =
          requestAnimationFrame(focusWhenBubbleReady);
      };

      pendingReplyTargetFocusFrameRef.current =
        requestAnimationFrame(focusWhenBubbleReady);
    },
    [cancelPendingReplyTargetFocusFrame, refs.messageBubbleRefs, viewport]
  );

  useLayoutEffect(() => {
    const pendingViewportSnapshot =
      pendingReplyTargetViewportSnapshotRef.current;

    if (pendingViewportSnapshot) {
      pendingReplyTargetViewportSnapshotRef.current = null;

      const messagesContainer = refs.messagesContainerRef.current;
      if (messagesContainer) {
        const scrollHeightDelta =
          messagesContainer.scrollHeight - pendingViewportSnapshot.scrollHeight;
        if (scrollHeightDelta > 0) {
          messagesContainer.scrollTop =
            pendingViewportSnapshot.scrollTop + scrollHeightDelta;
        }
      }
    }

    const pendingFocusMessageId = pendingReplyTargetFocusMessageIdRef.current;
    if (
      pendingFocusMessageId &&
      (refs.messageBubbleRefs.current.has(pendingFocusMessageId) ||
        messages.some(messageItem => messageItem.id === pendingFocusMessageId))
    ) {
      scheduleReplyTargetViewportFocus(pendingFocusMessageId);
    }
  }, [
    messages,
    refs.messageBubbleRefs,
    refs.messagesContainerRef,
    scheduleReplyTargetViewportFocus,
  ]);

  useLayoutEffect(
    () => () => {
      cancelPendingReplyTargetFocusFrame();
    },
    [cancelPendingReplyTargetFocusFrame]
  );

  const focusReplyTargetFromMessages = useCallback(
    (messageId: string, availableMessages: ChatMessage[]) => {
      const { openImageGroupInPortal } = previews;
      const replyingMessage =
        availableMessages.find(candidate => candidate.id === messageId) || null;
      if (!replyingMessage) {
        return false;
      }

      const imageGroupRenderItem = getReplyTargetImageGroup(
        messageId,
        availableMessages
      );

      if (imageGroupRenderItem?.kind === 'image-group') {
        scheduleReplyTargetViewportFocus(messageId);
        void openImageGroupInPortal(
          imageGroupRenderItem.messages,
          messageId,
          replyingMessage.file_preview_url || null
        );
        return true;
      }

      viewport.focusReplyTargetMessage(messageId);
      return true;
    },
    [
      getReplyTargetImageGroup,
      previews,
      scheduleReplyTargetViewportFocus,
      viewport,
    ]
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
              {
                beforeLimit: REPLY_TARGET_CONTEXT_BEFORE_LIMIT,
                afterLimit: REPLY_TARGET_CONTEXT_AFTER_LIMIT,
              }
            );
          if (
            error ||
            !searchContextMessages ||
            searchContextMessages.length === 0
          ) {
            if (error) {
              console.error('Error loading reply target context:', error);
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

          const hasOlderMessages =
            await confirmReplyTargetContextHasOlderMessages(
              targetUserId,
              searchContextMessages,
              getReplyTargetContextHasOlderMessages(
                messageId,
                searchContextMessages
              )
            );

          viewport.suspendPinnedViewportSync?.();
          mergeSearchContextMessages(searchContextMessages, {
            hasOlderMessages,
          });

          const mergedMessages = [...messages, ...searchContextMessages].reduce<
            Map<string, ChatMessage>
          >((messagesById, messageItem) => {
            messagesById.set(messageItem.id, messageItem);
            return messagesById;
          }, new Map());
          const orderedMergedMessages = [...mergedMessages.values()].sort(
            (leftMessage, rightMessage) => {
              const createdAtOrder = leftMessage.created_at.localeCompare(
                rightMessage.created_at
              );
              if (createdAtOrder !== 0) {
                return createdAtOrder;
              }

              return leftMessage.id.localeCompare(rightMessage.id);
            }
          );

          const imageGroupRenderItem = getReplyTargetImageGroup(
            messageId,
            orderedMergedMessages
          );
          if (imageGroupRenderItem?.kind === 'image-group') {
            scheduleReplyTargetViewportFocus(messageId);
            void previews.openImageGroupInPortal(
              imageGroupRenderItem.messages,
              messageId,
              searchContextMessages.find(message => message.id === messageId)
                ?.file_preview_url || null
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
      confirmReplyTargetContextHasOlderMessages,
      currentChannelId,
      getReplyTargetContextHasOlderMessages,
      getReplyTargetImageGroup,
      focusReplyTargetFromMessages,
      isOpen,
      mergeSearchContextMessages,
      messages,
      previews,
      scheduleReplyTargetViewportFocus,
      refs.messagesContainerRef,
      targetUserId,
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
