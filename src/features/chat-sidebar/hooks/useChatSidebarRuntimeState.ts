import { useCallback } from 'react';
import type { UserDetails } from '@/types/database';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { ChatSidebarPanelProps } from '../types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatCaptionData } from './useChatCaptionData';
import { useChatComposer } from './useChatComposer';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatSidebarPreviewState } from './useChatSidebarPreviewState';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatViewport } from './useChatViewport';

interface UseChatSidebarRuntimeStateProps extends ChatSidebarPanelProps {
  user: UserDetails | null;
  currentChannelId: string | null;
  refs: ReturnType<typeof useChatSidebarRefs>;
  displayTargetPhotoUrl: string | null;
}

export const useChatSidebarRuntimeState = ({
  isOpen,
  onClose,
  targetUser,
  user,
  currentChannelId,
  refs,
  displayTargetPhotoUrl,
}: UseChatSidebarRuntimeStateProps) => {
  const session = useChatSession({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
  });

  const focusMessageComposer = useCallback(() => {
    const textarea = refs.messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [refs.messageInputRef]);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages: session.messages,
    setMessages: session.setMessages,
    closeMessageMenu: refs.closeMessageMenu,
    scheduleScrollMessagesToBottom: refs.scheduleScrollMessagesToBottom,
    messageInputRef: refs.messageInputRef,
    focusMessageComposer,
  });

  const captionData = useChatCaptionData(session.messages);

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages: session.messages,
    mergeSearchContextMessages: session.mergeSearchContextMessages,
    user,
    targetUser,
    captionData,
    closeMessageMenu: refs.closeMessageMenu,
    getAttachmentFileName,
  });

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages: session.messages,
    userId: user?.id,
    targetUserId: targetUser?.id,
    messagesCount: session.messages.length,
    loading: session.loading,
    messageInputHeight: composer.messageInputHeight,
    composerContextualOffset: composer.composerContextualOffset,
    isMessageInputMultiline: composer.isMessageInputMultiline,
    pendingComposerAttachmentsCount: composer.pendingComposerAttachments.length,
    normalizedMessageSearchQuery: interaction.normalizedMessageSearchQuery,
    isMessageSearchMode: interaction.isMessageSearchMode,
    activeSearchMessageId: interaction.activeSearchMessageId,
    searchNavigationTick: interaction.searchNavigationTick,
    editingMessageId: composer.editingMessageId,
    focusMessageComposer,
    markMessageIdsAsRead: session.markMessageIdsAsRead,
    messagesContainerRef: refs.messagesContainerRef,
    messagesEndRef: refs.messagesEndRef,
    composerContainerRef: refs.composerContainerRef,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    messageBubbleRefs: refs.messageBubbleRefs,
  });

  refs.closeMessageMenuRef.current = viewport.closeMessageMenu;
  refs.scheduleScrollMessagesToBottomRef.current =
    viewport.scheduleScrollMessagesToBottom;

  const previews = useChatSidebarPreviewState({
    messages: session.messages,
    pendingComposerAttachments: composer.pendingComposerAttachments,
    handleAttachImageClick: composer.handleAttachImageClick,
    handleAttachDocumentClick: composer.handleAttachDocumentClick,
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

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages: interaction.selectedVisibleMessages,
    setSelectedMessageIds: interaction.setSelectedMessageIds,
    deleteMessages: composer.handleDeleteMessages,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    user,
    targetUser,
    displayTargetPhotoUrl,
    session,
    composer,
    interaction,
    viewport,
    previews,
    refs,
    actions: {
      getInitials,
      getInitialsColor,
      getAttachmentFileName,
      getAttachmentFileKind,
      focusMessageComposer,
      handleDeleteSelectedMessages,
      handleClose,
      toggleMessageMenu,
    },
  };
};
