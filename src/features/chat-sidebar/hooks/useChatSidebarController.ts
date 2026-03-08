import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef, useState } from 'react';
import type { ChatSidebarPanelProps } from '../types';
import { getAttachmentFileName } from '../utils/attachment';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { generateChannelId } from '../utils/channel';
import {
  createChatHeaderModel,
  createComposerPanelModel,
  createMessagesPaneModel,
  withMessagesPaneToggleExpand,
} from './chatSidebarViewModels';
import { useChatComposer } from './useChatComposer';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatSidebarControllerBridge } from './useChatSidebarControllerBridge';
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
  const bridge = useChatSidebarControllerBridge();
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? generateChannelId(user.id, targetUser.id) : null;

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const {
    messages,
    setMessages,
    loading,
    targetUserPresence,
    performClose,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    markMessageIdsAsRead,
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
    closeMessageMenu: bridge.closeMessageMenu,
    scheduleScrollMessagesToBottom: bridge.scheduleScrollMessagesToBottom,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    messageInputRef,
    focusMessageComposer,
  });

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    user,
    targetUser,
    closeMessageMenu: bridge.closeMessageMenu,
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
  bridge.syncViewportBridge({
    closeMessageMenu: viewport.closeMessageMenu,
    scheduleScrollMessagesToBottom: viewport.scheduleScrollMessagesToBottom,
  });

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
    void performClose();
    onClose();
  }, [onClose, performClose]);

  const headerModel = createChatHeaderModel({
    targetUser,
    displayTargetPhotoUrl,
    targetUserPresence,
    interaction,
    handleDeleteSelectedMessages,
    handleClose,
    getInitials,
    getInitialsColor,
  });

  const messagesModel = withMessagesPaneToggleExpand(
    createMessagesPaneModel({
      loading,
      messages,
      user,
      composer: {
        messageInputHeight: composer.messageInputHeight,
        composerContextualOffset: composer.composerContextualOffset,
        editingMessageId: composer.editingMessageId,
        handleEditMessage: composer.handleEditMessage,
        handleCopyMessage: composer.handleCopyMessage,
        handleDownloadMessage: composer.handleDownloadMessage,
        handleDeleteMessage: composer.handleDeleteMessage,
      },
      viewport: {
        composerContainerHeight: viewport.composerContainerHeight,
        openMenuMessageId: viewport.openMenuMessageId,
        menuPlacement: viewport.menuPlacement,
        menuSideAnchor: viewport.menuSideAnchor,
        shouldAnimateMenuOpen: viewport.shouldAnimateMenuOpen,
        menuTransitionSourceId: viewport.menuTransitionSourceId,
        menuOffsetX: viewport.menuOffsetX,
        flashingMessageId: viewport.flashingMessageId,
        isFlashHighlightVisible: viewport.isFlashHighlightVisible,
        hasNewMessages: viewport.hasNewMessages,
        isAtBottom: viewport.isAtBottom,
        closeMessageMenu: viewport.closeMessageMenu,
        toggleMessageMenu,
        scrollToBottom: viewport.scrollToBottom,
        messagesContainerRef,
        messagesEndRef,
        messageBubbleRefs,
        initialMessageAnimationKeysRef,
        initialOpenJumpAnimationKeysRef,
      },
      interaction,
      expandedMessageIds,
    }),
    handleToggleExpand
  );

  const composerModel = createComposerPanelModel({
    composer: {
      ...composer,
      messageInputRef,
      composerContainerRef,
    },
    viewport,
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
