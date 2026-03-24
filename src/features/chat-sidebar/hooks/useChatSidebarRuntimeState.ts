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
import { useChatConversationMutations } from './useChatConversationMutations';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useChatSidebarUiState } from './useChatSidebarUiState';

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
    messagesContainerRef: refs.messagesContainerRef,
    getAttachmentFileName,
  });

  const ui = useChatSidebarUiState({
    isOpen,
    currentChannelId,
    messages: session.messages,
    loading: session.loading,
    userId: user?.id,
    targetUserId: targetUser?.id,
    normalizedMessageSearchQuery: interaction.normalizedMessageSearchQuery,
    isMessageSearchMode: interaction.isMessageSearchMode,
    activeSearchMessageId: interaction.activeSearchMessageId,
    searchNavigationTick: interaction.searchNavigationTick,
    markMessageIdsAsRead: session.markMessageIdsAsRead,
    refs,
    closeMessageMenu: refs.closeMessageMenu,
    getAttachmentFileName,
    getAttachmentFileKind,
    captionData,
  });

  const mutations = useChatConversationMutations({
    user,
    targetUser,
    currentChannelId,
    messages: session.messages,
    setMessages: session.setMessages,
    message: ui.composer.message,
    setMessage: ui.composer.setMessage,
    editingMessageId: ui.composer.editingMessageId,
    rawAttachmentUrl: ui.composer.rawAttachmentUrl,
    setEditingMessageId: ui.composer.setEditingMessageId,
    pendingComposerAttachments: ui.composer.pendingComposerAttachments,
    clearPendingComposerAttachments:
      ui.composer.clearPendingComposerAttachments,
    restorePendingComposerAttachments:
      ui.composer.restorePendingComposerAttachments,
    isComposerAttachmentLoading:
      ui.composer.isLoadingAttachmentComposerAttachments,
    closeMessageMenu: refs.closeMessageMenu,
    focusMessageComposer: ui.focusMessageComposer,
    scheduleScrollMessagesToBottom: refs.scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow: ui.composer.triggerSendSuccessGlow,
    pendingImagePreviewUrlsRef: ui.composer.pendingImagePreviewUrlsRef,
  });

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages: interaction.selectedVisibleMessages,
    setSelectedMessageIds: interaction.setSelectedMessageIds,
    deleteMessages: mutations.handleDeleteMessages,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    user,
    targetUser,
    displayTargetPhotoUrl,
    session,
    composer: ui.composer,
    mutations,
    interaction,
    viewport: ui.viewport,
    previews: ui.previews,
    refs,
    actions: {
      getInitials,
      getInitialsColor,
      getAttachmentFileName,
      getAttachmentFileKind,
      focusMessageComposer: ui.focusMessageComposer,
      handleDeleteSelectedMessages,
      handleClose,
      toggleMessageMenu: ui.toggleMessageMenu,
    },
  };
};

export type ChatSidebarRuntimeState = ReturnType<
  typeof useChatSidebarRuntimeState
>;
