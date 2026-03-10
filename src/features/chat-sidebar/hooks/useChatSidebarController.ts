import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef, useState } from 'react';
import type { ChatSidebarPanelProps } from '../types';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { generateChannelId } from '../utils/channel';
import {
  buildChatComposerModel,
  buildChatHeaderModel,
  buildChatMessagesModel,
} from './chatSidebarModels';
import { useChatComposer } from './useChatComposer';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatViewport } from './useChatViewport';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

export const useChatSidebarController = ({
  isOpen,
  onClose,
  targetUser,
}: ChatSidebarPanelProps) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const { user } = useAuthStore();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
  const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
  const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollMessagesToBottomRef = useRef<() => void>(() => {});
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? generateChannelId(user.id, targetUser.id) : null;
  const closeMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);
  const scheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollMessagesToBottomRef.current();
  }, []);

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const {
    messages,
    setMessages,
    loading,
    loadError,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    markMessageIdsAsRead,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    loadOlderMessages,
    retryLoadMessages,
  } = useChatSession({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
  });

  const focusMessageComposer = useCallback(() => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, []);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    closeMessageMenu,
    scheduleScrollMessagesToBottom,
    messageInputRef,
    focusMessageComposer,
  });

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    setMessages,
    user,
    targetUser,
    closeMessageMenu,
    getAttachmentFileName,
  });

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages,
    userId: user?.id,
    targetUserId: targetUser?.id,
    messagesCount: messages.length,
    loading,
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
    markMessageIdsAsRead,
    messagesContainerRef,
    messagesEndRef,
    composerContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
  });
  closeMessageMenuRef.current = viewport.closeMessageMenu;
  scheduleScrollMessagesToBottomRef.current =
    viewport.scheduleScrollMessagesToBottom;

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      composer.closeAttachModal();
      viewport.toggleMessageMenu(anchor, messageId, preferredSide);
    },
    [composer, viewport]
  );

  const handleToggleExpand = useCallback((messageId: string) => {
    setExpandedMessageIds(previousIds => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(messageId)) {
        nextIds.delete(messageId);
      } else {
        nextIds.add(messageId);
      }
      return nextIds;
    });
  }, []);

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages: interaction.selectedVisibleMessages,
    setSelectedMessageIds: interaction.setSelectedMessageIds,
    deleteMessage: composer.handleDeleteMessage,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const headerModel = buildChatHeaderModel({
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    interaction,
    onDeleteSelectedMessages: handleDeleteSelectedMessages,
    onClose: handleClose,
    getInitials,
    getInitialsColor,
  });

  const messagesModel = buildChatMessagesModel({
    loading,
    loadError,
    messages,
    user,
    composer,
    viewport,
    interaction,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    expandedMessageIds,
    messagesContainerRef,
    messagesEndRef,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    toggleMessageMenu,
    handleToggleExpand,
    getAttachmentFileName,
    getAttachmentFileKind,
    loadOlderMessages,
    retryLoadMessages,
  });

  const composerModel = buildChatComposerModel({
    composer,
    messageInputRef,
    composerContainerRef,
    focusEditingTargetMessage: viewport.focusEditingTargetMessage,
  });

  return {
    chatHeaderContainerRef,
    isAtTop: viewport.isAtTop,
    handleChatPortalBackgroundClick: viewport.handleChatPortalBackgroundClick,
    headerModel,
    messagesModel,
    composerModel,
  };
};
